import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, multipart, TestApp, userWithAccess, XHR } from './test-app.js';

const png = { filename: 'logo.png', type: 'image/png', bytes: Buffer.from('not really a png') };

/** Every asset route checks its space first, then the asset; ids that aren't UUIDs are 404s; bodies are strict. */
describe('app API: assets check their space and ids', () => {
  let t: TestApp;
  let cookie: string;
  let admin: ReturnType<typeof api>;
  let base: string;
  let otherBase: string;
  let folderId: string;

  beforeAll(async () => {
    t = await createTestApp();
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' });
    admin = api(t, cookie);
    base = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'One' })).json().id}/assets`;
    otherBase = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'Two' })).json().id}/assets`;
    folderId = (await admin.post(`${base}/folders`, { name: 'Images' })).json().id;
  });

  afterAll(() => t?.close());

  const upload = (spaceBase: string, fields: Record<string, string> = {}) => {
    const body = multipart(fields, png);
    return t.request({
      method: 'POST',
      url: `${spaceBase}/files`,
      headers: { ...XHR, cookie, 'content-type': body.contentType },
      payload: body.payload,
    });
  };

  /** Every route of a space's assets, for `spaceBase` and `id`. */
  const routes = (spaceBase: string, id: string) => [
    () => admin.get(spaceBase),
    () => admin.get(`${spaceBase}/folders`),
    () => admin.get(`${spaceBase}/files`),
    () => admin.get(`${spaceBase}/count`),
    () => admin.get(`${spaceBase}/${id}`),
    () => admin.get(`${spaceBase}/${id}/usage`),
    () => admin.post(`${spaceBase}/folders`, { name: 'Videos' }),
    () => upload(spaceBase),
    () => admin.patch(`${spaceBase}/${id}`, { name: 'Pictures' }),
    () => admin.patch(`${spaceBase}/${id}`, { parentId: null }),
    () => admin.delete(`${spaceBase}/${id}`),
  ];

  it('answers "Space not found" on every route of an unknown space, the lists, the count and the upload included', async () => {
    for (const route of routes(`/api/app/spaces/${newUuid()}/assets`, folderId)) {
      const response = await route();
      expect(response.statusCode, response.body).toBe(404);
      expect(response.json().message).toBe('Space not found');
    }
  });

  it('answers 404 for a space or asset id that is not a UUID (never a 500)', async () => {
    for (const route of routes('/api/app/spaces/not-a-uuid/assets', folderId)) {
      expect((await route()).statusCode).toBe(404);
    }
    for (const response of [
      await admin.get(`${base}/not-a-uuid`),
      await admin.get(`${base}/not-a-uuid/usage`),
      await admin.patch(`${base}/not-a-uuid`, { name: 'Pictures' }),
      await admin.patch(`${base}/not-a-uuid`, { parentId: null }),
      await admin.delete(`${base}/not-a-uuid`),
    ]) {
      expect(response.statusCode).toBe(404);
    }
  });

  it('answers "Asset not found" for an asset of another space, and changes nothing', async () => {
    for (const response of [
      await admin.get(`${otherBase}/${folderId}`),
      await admin.get(`${otherBase}/${folderId}/usage`),
      await admin.patch(`${otherBase}/${folderId}`, { name: 'Pictures' }),
      await admin.patch(`${otherBase}/${folderId}`, { parentId: null }),
      await admin.delete(`${otherBase}/${folderId}`),
    ]) {
      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe('Asset not found');
    }
    expect((await admin.get(`${base}/${folderId}`)).json()).toMatchObject({ name: 'Images' });
    expect((await admin.get(otherBase)).json()).toMatchObject({ items: [], total: 0 });
  });

  it('refuses an unknown field on every body, in the upload fields and a count of an unknown kind, and changes nothing', async () => {
    for (const [call, field] of [
      [() => admin.post(`${base}/folders`, { name: 'Videos', kind: 'FOLDER' }), 'kind'],
      [() => admin.patch(`${base}/${folderId}`, { name: 'Pictures', slug: 'pictures' }), 'slug'],
      [() => upload(base, { parentId: folderId, folder: 'Images' }), 'folder'],
      [() => admin.get(`${base}/count?kind=DOCUMENT`), 'kind'],
    ] as const) {
      const response = await call();
      expect(response.statusCode, field).toBe(400);
      expect(response.body, field).toContain(field);
    }
    expect((await admin.get(base)).json().items.map((it: { name: string }) => it.name)).toEqual(['Images']);
  });
});
