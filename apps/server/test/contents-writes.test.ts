import { WebhookEvent } from '@localess/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EventService } from '../src/infra/events/event.service.js';
import { ContentRepository } from '../src/modules/contents/repositories/content.repository.js';
import { WebhookDispatcher } from '../src/shared/services/webhook-dispatcher.service.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/**
 * Content writes: one event per changed row and none for a refused write; `content.changed` for a rename that keeps
 * the path, not for a move; the tree's rules checked again under the contents lock.
 */
describe('app API: content writes', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let spaceId: string;
  let base: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    spaceId = (await admin.post('/api/app/spaces', { name: 'One' })).json().id;
    base = `/api/app/spaces/${spaceId}/contents`;
    await admin.post(`/api/app/spaces/${spaceId}/schemas`, { name: 'page', type: 'ROOT' });
  });

  afterAll(() => t?.close());

  /** The `contents` events and the webhooks `write` sent. */
  async function sent(write: () => Promise<unknown>): Promise<{ events: string[]; webhooks: string[] }> {
    const publish = vi.spyOn(t.app.get(EventService), 'publish');
    const dispatch = vi.spyOn(t.app.get(WebhookDispatcher), 'dispatch');
    try {
      await write();
      return {
        events: publish.mock.calls.filter(([event]) => event.entity === 'contents').map(([event]) => `${event.op} ${event.id}`),
        webhooks: (dispatch.mock.calls as unknown as [string, string, { fullSlug: string }][]).map(
          ([, event, payload]) => `${event} ${payload.fullSlug}`,
        ),
      };
    } finally {
      publish.mockRestore();
      dispatch.mockRestore();
    }
  }

  it('answers the content as written, with one event per changed row', async () => {
    let folder = '';
    let doc = '';
    const created = await sent(async () => {
      folder = (await admin.post(base, { kind: 'FOLDER', name: 'Blog', slug: 'blog' })).json().id;
      const response = await admin.post(base, { kind: 'DOCUMENT', parentId: folder, name: 'Hello', slug: 'hello', schema: 'page' });
      expect(response.json()).toMatchObject({ kind: 'DOCUMENT', name: 'Hello', parentId: folder, fullSlug: 'blog/hello', schema: 'page' });
      doc = response.json().id;
    });
    expect(created).toEqual({ events: [`created ${folder}`, `created ${doc}`], webhooks: [] });

    // A rename keeping the path: content.changed; a move: no webhook, an event for the row.
    const renamed = await sent(async () =>
      expect((await admin.patch(`${base}/${doc}`, { name: 'Hi' })).json()).toMatchObject({ name: 'Hi' }),
    );
    expect(renamed).toEqual({ events: [`updated ${doc}`], webhooks: [`${WebhookEvent.CONTENT_CHANGED} blog/hello`] });
    const moved = await sent(async () =>
      expect((await admin.patch(`${base}/${doc}`, { parentId: null })).json()).toMatchObject({ fullSlug: 'hello' }),
    );
    expect(moved).toEqual({ events: [`updated ${doc}`], webhooks: [] });

    const saved = await sent(async () =>
      expect((await admin.put(`${base}/${doc}/data`, { data: { _id: doc, _schema: 'page', title: 'x' } })).json()).toMatchObject({
        data: { title: 'x' },
      }),
    );
    expect(saved).toEqual({ events: [`updated ${doc}`], webhooks: [`${WebhookEvent.CONTENT_CHANGED} hello`] });

    // A folder's delete: an event and a webhook per item.
    await admin.patch(`${base}/${doc}`, { parentId: folder });
    const deleted = await sent(async () => expect((await admin.delete(`${base}/${folder}`)).statusCode).toBe(204));
    expect(deleted.events.sort()).toEqual([`deleted ${doc}`, `deleted ${folder}`].sort());
    expect(deleted.webhooks.sort()).toEqual([`${WebhookEvent.CONTENT_CHANGED} blog`, `${WebhookEvent.CONTENT_CHANGED} blog/hello`].sort());
  });

  it('refuses a write that breaks a rule of the tree (the same messages), sending nothing', async () => {
    const folder = (await admin.post(base, { kind: 'FOLDER', name: 'News', slug: 'news' })).json().id;
    const inside = (await admin.post(base, { kind: 'FOLDER', parentId: folder, name: 'Old', slug: 'old' })).json().id;
    const doc = (await admin.post(base, { kind: 'DOCUMENT', name: 'Start', slug: 'start', schema: 'page' })).json().id;
    const refused = await sent(async () => {
      for (const [call, status, message] of [
        [() => admin.post(base, { kind: 'DOCUMENT', name: 'X', slug: 'x', schema: 'nope' }), 400, "No ROOT schema 'nope' in the space"],
        [() => admin.post(base, { kind: 'FOLDER', parentId: doc, name: 'X', slug: 'x' }), 400, 'No such folder'],
        [() => admin.post(base, { kind: 'FOLDER', name: 'X', slug: 'news' }), 409, "'news' is already used"],
        [() => admin.patch(`${base}/${folder}`, { parentId: inside }), 400, 'A folder cannot be moved into itself'],
        [() => admin.patch(`${base}/${doc}`, { slug: 'news' }), 409, "'news' is already used"],
        [() => admin.put(`${base}/${folder}/data`, { data: { _id: folder, _schema: 'page' } }), 400, 'Only documents have data'],
        [() => admin.post(`${base}/${folder}/clone`), 400, 'Only documents can be cloned'],
      ] as const) {
        expect((await call()).json(), message).toMatchObject({ statusCode: status, message });
      }
    });
    expect(refused).toEqual({ events: [], webhooks: [] });
  });

  it('checks the rules again under the contents lock: what changed since the service read it is refused', async () => {
    const repository = t.app.get(ContentRepository);
    const folder = (await admin.post(base, { kind: 'FOLDER', name: 'Shop', slug: 'shop' })).json().id;
    // As if the service read before another write took the slug, deleted the folder or the schema.
    await admin.post(base, { kind: 'FOLDER', name: 'Taken', slug: 'taken' });
    await expect(repository.create(spaceId, { kind: 'FOLDER', name: 'T', slug: 'taken' })).rejects.toThrow("'taken' is already used");
    await admin.delete(`${base}/${folder}`);
    await expect(repository.create(spaceId, { kind: 'FOLDER', parentId: folder, name: 'X', slug: 'x' })).rejects.toThrow('No such folder');
    await expect(repository.create(spaceId, { kind: 'DOCUMENT', name: 'X', slug: 'x', schema: 'gone' })).rejects.toThrow(
      "No ROOT schema 'gone' in the space",
    );
    // A content gone meanwhile: nothing written, nothing deleted.
    await expect(repository.update(spaceId, folder, { name: 'Y' })).resolves.toBeUndefined();
    await expect(repository.delete(spaceId, folder)).resolves.toEqual([]);
  });
});
