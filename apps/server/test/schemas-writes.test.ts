import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { EventService } from '../src/infra/events/event.service.js';
import { SchemaRepository } from '../src/modules/schemas/repositories/schema.repository.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/** Schema writes: one event per changed row, none for a refused write; the in-use check again under the row's lock. */
describe('app API: schema writes', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let spaceId: string;
  let base: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    spaceId = (await admin.post('/api/app/spaces', { name: 'One' })).json().id;
    base = `/api/app/spaces/${spaceId}/schemas`;
  });

  afterAll(() => t?.close());

  /** The `schemas` events `write` sent, as `op` and id. */
  async function events(write: () => Promise<unknown>): Promise<{ op: string; id?: string }[]> {
    const publish = vi.spyOn(t.app.get(EventService), 'publish');
    try {
      await write();
      return publish.mock.calls
        .filter(([event]) => event.entity === 'schemas')
        .map(([event]) => ({ op: event.op, id: event.id ?? undefined }));
    } finally {
      publish.mockRestore();
    }
  }

  it('answers the schema as written, with one event per write', async () => {
    let id = '';
    expect(
      await events(async () => {
        const created = await admin.post(base, { name: 'card', type: 'NODE', displayName: 'Card' });
        expect(created.statusCode).toBe(201);
        expect(created.json()).toMatchObject({ name: 'card', displayName: 'Card' });
        id = created.json().id;
      }),
    ).toEqual([{ op: 'created', id }]);
    expect(
      await events(async () =>
        expect((await admin.put(`${base}/${id}`, { description: 'A card' })).json()).toMatchObject({ description: 'A card' }),
      ),
    ).toEqual([{ op: 'updated', id }]);
    expect(
      await events(async () =>
        expect((await admin.put(`${base}/${id}/name`, { name: 'tile' })).json()).toMatchObject({ id, name: 'tile' }),
      ),
    ).toEqual([{ op: 'updated', id }]);
    expect(await events(async () => expect((await admin.delete(`${base}/${id}`)).statusCode).toBe(204))).toEqual([{ op: 'deleted', id }]);
  });

  it('refuses to rename or delete a schema in use (409, saying where), sending no event', async () => {
    const used = (await admin.post(base, { name: 'page', type: 'ROOT' })).json().id;
    await admin.post(`/api/app/spaces/${spaceId}/contents`, { kind: 'DOCUMENT', name: 'Home', slug: 'home', schema: 'page' });
    const message = "Schema 'page' is in use: used by 1 content: Home (home)";
    expect(
      await events(async () => {
        expect((await admin.put(`${base}/${used}/name`, { name: 'other' })).json()).toMatchObject({ statusCode: 409, message });
        expect((await admin.delete(`${base}/${used}`)).json()).toMatchObject({ statusCode: 409, message });
      }),
    ).toEqual([]);
  });

  it('checks again under the row lock: a schema taken since the service checked is neither renamed nor deleted', async () => {
    const repository = t.app.get(SchemaRepository);
    const id = (await admin.post(base, { name: 'teaser', type: 'ROOT' })).json().id;
    // As if the service checked before this content took the schema.
    await admin.post(`/api/app/spaces/${spaceId}/contents`, { kind: 'DOCUMENT', name: 'News', slug: 'news', schema: 'teaser' });
    const message = "Schema 'teaser' is in use: used by 1 content: News (news)";

    await expect(repository.rename(spaceId, id, 'renamed')).rejects.toThrow(message);
    await expect(repository.delete(spaceId, id)).rejects.toThrow(message);
    expect((await admin.get(`${base}/${id}`)).json()).toMatchObject({ name: 'teaser' });
  });
});
