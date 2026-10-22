import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { EventService } from '../src/infra/events/event.service.js';
import { AssetRepository } from '../src/modules/assets/repositories/asset.repository.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/**
 * Asset writes: each answers the asset as a read gives it afterwards, with one event per changed row and none for a
 * refused write; the tree's rules checked again under the assets lock.
 */
describe('app API: asset writes', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let spaceId: string;
  let base: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    spaceId = (await admin.post('/api/app/spaces', { name: 'One' })).json().id;
    base = `/api/app/spaces/${spaceId}/assets`;
  });

  afterAll(() => t?.close());

  /** The `assets` events `write` sent. */
  async function sent(write: () => Promise<unknown>): Promise<string[]> {
    const publish = vi.spyOn(t.app.get(EventService), 'publish');
    try {
      await write();
      return publish.mock.calls.filter(([event]) => event.entity === 'assets').map(([event]) => `${event.op} ${event.id}`);
    } finally {
      publish.mockRestore();
    }
  }

  it('answers the asset as a read gives it afterwards, with one event per changed row', async () => {
    let images = '';
    let photos = '';
    const created = await sent(async () => {
      images = (await admin.post(`${base}/folders`, { name: 'Images' })).json().id;
      const response = await admin.post(`${base}/folders`, { name: 'Photos', parentId: images });
      photos = response.json().id;
      expect(response.json()).toEqual((await admin.get(`${base}/${photos}`)).json());
      expect(response.json()).toMatchObject({ kind: 'FOLDER', name: 'Photos', parentId: images });
    });
    expect(created).toEqual([`created ${images}`, `created ${photos}`]);

    const renamed = await sent(async () => {
      const response = await admin.patch(`${base}/${photos}`, { name: 'Pictures' });
      expect(response.json()).toEqual((await admin.get(`${base}/${photos}`)).json());
      expect(response.json()).toMatchObject({ name: 'Pictures' });
    });
    expect(renamed).toEqual([`updated ${photos}`]);

    const moved = await sent(async () => {
      const response = await admin.patch(`${base}/${photos}`, { parentId: null });
      expect(response.json()).toEqual((await admin.get(`${base}/${photos}`)).json());
      expect(response.json()).not.toHaveProperty('parentId');
    });
    expect(moved).toEqual([`updated ${photos}`]);

    // A folder's delete: an event per row.
    await admin.patch(`${base}/${photos}`, { parentId: images });
    const deleted = await sent(async () => expect((await admin.delete(`${base}/${images}`)).statusCode).toBe(204));
    expect(deleted.sort()).toEqual([`deleted ${images}`, `deleted ${photos}`].sort());
  });

  it('renames and moves in one PATCH: one event, the answer as a read gives it', async () => {
    const target = (await admin.post(`${base}/folders`, { name: 'Target' })).json().id;
    const folder = (await admin.post(`${base}/folders`, { name: 'Moving' })).json().id;
    const changed = await sent(async () => {
      const response = await admin.patch(`${base}/${folder}`, { name: 'Moved', parentId: target });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json()).toEqual((await admin.get(`${base}/${folder}`)).json());
      expect(response.json()).toMatchObject({ name: 'Moved', parentId: target });
    });
    expect(changed).toEqual([`updated ${folder}`]);
    // A refused move does not rename either.
    const refused = await admin.patch(`${base}/${target}`, { name: 'Renamed', parentId: folder });
    expect(refused.json()).toMatchObject({ statusCode: 400, message: 'A folder cannot be moved into itself' });
    expect((await admin.get(`${base}/${target}`)).json()).toMatchObject({ name: 'Target' });
  });

  it('refuses a write that breaks a rule of the tree (the same messages), sending nothing', async () => {
    const folder = (await admin.post(`${base}/folders`, { name: 'News' })).json().id;
    const inside = (await admin.post(`${base}/folders`, { name: 'Old', parentId: folder })).json().id;
    const refused = await sent(async () => {
      for (const [call, message] of [
        [() => admin.post(`${base}/folders`, { name: 'X', parentId: newUuid() }), 'No such folder'],
        [() => admin.patch(`${base}/${folder}`, { parentId: newUuid() }), 'No such folder'],
        [() => admin.patch(`${base}/${folder}`, { parentId: inside }), 'A folder cannot be moved into itself'],
        [() => admin.patch(`${base}/${folder}`, { parentId: folder }), 'A folder cannot be moved into itself'],
        [() => admin.patch(`${base}/${folder}`, { alt: 'A folder' }), 'Only files have alt text'],
      ] as const) {
        expect((await call()).json(), message).toMatchObject({ statusCode: 400, message });
      }
    });
    expect(refused).toEqual([]);
  });

  it('checks the parent again under the assets lock: a folder gone since the service read it is refused', async () => {
    const repository = t.app.get(AssetRepository);
    const folder = (await admin.post(`${base}/folders`, { name: 'Shop' })).json().id;
    const other = (await admin.post(`${base}/folders`, { name: 'Other' })).json().id;
    // As if the service read before another write deleted the folder.
    await admin.delete(`${base}/${folder}`);
    await expect(repository.createFolder(spaceId, folder, 'X')).rejects.toThrow('No such folder');
    await expect(repository.update(spaceId, other, { parentId: folder })).rejects.toThrow('No such folder');
    // An asset gone meanwhile: nothing written, nothing deleted.
    await expect(repository.update(spaceId, folder, { name: 'Y' })).resolves.toBeUndefined();
    await expect(repository.update(spaceId, folder, { parentId: null })).resolves.toBeUndefined();
    await expect(repository.delete(spaceId, folder)).resolves.toEqual([]);
    expect((await admin.get(`${base}/${other}`)).json()).toMatchObject({ name: 'Other' });
  });
});
