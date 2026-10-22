import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/** Every content route checks its space first, then the content; ids that aren't UUIDs are 404s. */
describe('app API: contents check their space and ids', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let base: string;
  let otherBase: string;
  let documentId: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    const spaceId = (await admin.post('/api/app/spaces', { name: 'One' })).json().id;
    base = `/api/app/spaces/${spaceId}/contents`;
    otherBase = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'Two' })).json().id}/contents`;
    await admin.post(`/api/app/spaces/${spaceId}/schemas`, { name: 'page', type: 'ROOT' });
    documentId = (await admin.post(base, { kind: 'DOCUMENT', name: 'Home', slug: 'home', schema: 'page' })).json().id;
  });

  afterAll(() => t?.close());

  /** Every route of a space's contents, for `spaceBase` and `id`. */
  const routes = (spaceBase: string, id: string) => [
    () => admin.get(spaceBase),
    () => admin.get(`${spaceBase}/names`),
    () => admin.get(`${spaceBase}/count`),
    () => admin.get(`${spaceBase}/${id}`),
    () => admin.post(spaceBase, { kind: 'FOLDER', name: 'Blog', slug: 'blog' }),
    () => admin.post(`${spaceBase}/${id}/clone`),
    () => admin.patch(`${spaceBase}/${id}`, { name: 'Start' }),
    () => admin.put(`${spaceBase}/${id}/data`, { data: { _id: id, _schema: 'page' } }),
    () => admin.post(`${spaceBase}/${id}/publish`),
    () => admin.post(`${spaceBase}/${id}/unpublish`),
    () => admin.delete(`${spaceBase}/${id}`),
  ];

  it('answers "Space not found" on every route of an unknown space, the lists and the count included', async () => {
    for (const route of routes(`/api/app/spaces/${newUuid()}/contents`, documentId)) {
      const response = await route();
      expect(response.statusCode, response.body).toBe(404);
      expect(response.json().message).toBe('Space not found');
    }
  });

  it('answers 404 for a space or content id that is not a UUID (never a 500)', async () => {
    for (const route of routes('/api/app/spaces/not-a-uuid/contents', documentId)) {
      expect((await route()).statusCode).toBe(404);
    }
    for (const response of [
      await admin.get(`${base}/not-a-uuid`),
      await admin.post(`${base}/not-a-uuid/clone`),
      await admin.patch(`${base}/not-a-uuid`, { name: 'Start' }),
      await admin.put(`${base}/not-a-uuid/data`, { data: { _id: 'x', _schema: 'page' } }),
      await admin.post(`${base}/not-a-uuid/publish`),
      await admin.delete(`${base}/not-a-uuid`),
    ]) {
      expect(response.statusCode).toBe(404);
    }
  });

  it('answers "Content not found" for a content of another space, and changes nothing', async () => {
    for (const response of [
      await admin.get(`${otherBase}/${documentId}`),
      await admin.post(`${otherBase}/${documentId}/clone`),
      await admin.patch(`${otherBase}/${documentId}`, { name: 'Start' }),
      await admin.put(`${otherBase}/${documentId}/data`, { data: { _id: documentId, _schema: 'page' } }),
      await admin.post(`${otherBase}/${documentId}/publish`),
      await admin.post(`${otherBase}/${documentId}/unpublish`),
      await admin.delete(`${otherBase}/${documentId}`),
    ]) {
      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe('Content not found');
    }
    expect((await admin.get(`${base}/${documentId}`)).json()).toMatchObject({ name: 'Home', slug: 'home' });
    expect((await admin.get(`${base}/${documentId}`)).json().publishedAt).toBeUndefined();
    expect((await admin.get(otherBase)).json()).toMatchObject({ items: [], total: 0 });
  });

  it('refuses an unknown field on every body and a count of an unknown kind, and changes nothing', async () => {
    for (const [call, field] of [
      [() => admin.post(base, { kind: 'FOLDER', name: 'Blog', slug: 'blog', schema: 'page' }), 'schema'],
      [() => admin.post(base, { kind: 'DOCUMENT', name: 'News', slug: 'news', schema: 'page', data: {} }), 'data'],
      [() => admin.patch(`${base}/${documentId}`, { name: 'Start', parentSlug: '' }), 'parentSlug'],
      [() => admin.put(`${base}/${documentId}/data`, { data: { _id: documentId, _schema: 'page' }, schema: 'page' }), 'schema'],
      [() => admin.get(`${base}/count?kind=FILE`), 'kind'],
    ] as const) {
      const response = await call();
      expect(response.statusCode, field).toBe(400);
      expect(response.body, field).toContain(field);
    }
    expect((await admin.get(`${base}/${documentId}`)).json()).toMatchObject({ name: 'Home', slug: 'home' });
    expect((await admin.get(base)).json().items.map((it: { name: string }) => it.name)).toEqual(['Home']);
  });

  it('still takes the reference lists an older editor tab sends with the data (ignored)', async () => {
    const response = await admin.put(`${base}/${documentId}/data`, { data: { _id: documentId, _schema: 'page' }, assets: [], links: [] });
    expect(response.statusCode, response.body).toBe(200);
  });
});
