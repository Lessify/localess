import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

/** Every schema route (and the OpenAPI document) checks its space first, then the schema; ids that aren't UUIDs are 404s. */
describe('app API: schemas check their space and ids', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let base: string;
  let otherBase: string;
  let schemaId: string;

  beforeAll(async () => {
    t = await createTestApp();
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    base = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'One' })).json().id}/schemas`;
    otherBase = `/api/app/spaces/${(await admin.post('/api/app/spaces', { name: 'Two' })).json().id}/schemas`;
    schemaId = (await admin.post(base, { name: 'card', type: 'NODE', displayName: 'Card' })).json().id;
  });

  afterAll(() => t?.close());

  /** Every route of a space's schemas, for `spaceBase` and `id`. */
  const routes = (spaceBase: string, id: string) => [
    () => admin.get(spaceBase),
    () => admin.get(`${spaceBase}?type=NODE`),
    () => admin.get(`${spaceBase}/${id}`),
    () => admin.get(`${spaceBase}/${id}/usage`),
    () => admin.post(spaceBase, { name: 'other', type: 'NODE' }),
    () => admin.put(`${spaceBase}/${id}`, { description: 'x' }),
    () => admin.put(`${spaceBase}/${id}/name`, { name: 'renamed' }),
    () => admin.delete(`${spaceBase}/${id}`),
    // The space's OpenAPI document, from its schemas.
    () => admin.post(spaceBase.replace(/schemas$/, 'open-api')),
  ];

  it('answers "Space not found" on every route of an unknown space, the list included', async () => {
    for (const route of routes(`/api/app/spaces/${newUuid()}/schemas`, schemaId)) {
      const response = await route();
      expect(response.statusCode, response.body).toBe(404);
      expect(response.json().message).toBe('Space not found');
    }
  });

  it('answers 404 for a space or schema id that is not a UUID (never a 500)', async () => {
    for (const route of routes('/api/app/spaces/not-a-uuid/schemas', schemaId)) {
      expect((await route()).statusCode).toBe(404);
    }
    for (const response of [
      await admin.get(`${base}/not-a-uuid`),
      await admin.get(`${base}/not-a-uuid/usage`),
      await admin.put(`${base}/not-a-uuid`, { description: 'x' }),
      await admin.put(`${base}/not-a-uuid/name`, { name: 'renamed' }),
      await admin.delete(`${base}/not-a-uuid`),
    ]) {
      expect(response.statusCode).toBe(404);
    }
  });

  it('answers "Schema not found" for a schema of another space, and changes nothing', async () => {
    for (const response of [
      await admin.get(`${otherBase}/${schemaId}`),
      await admin.get(`${otherBase}/${schemaId}/usage`),
      await admin.put(`${otherBase}/${schemaId}`, { description: 'x' }),
      await admin.put(`${otherBase}/${schemaId}/name`, { name: 'renamed' }),
      await admin.delete(`${otherBase}/${schemaId}`),
    ]) {
      expect(response.statusCode).toBe(404);
      expect(response.json().message).toBe('Schema not found');
    }
    expect((await admin.get(`${base}/${schemaId}`)).json()).toMatchObject({ name: 'card', displayName: 'Card' });
    expect((await admin.get(otherBase)).json()).toEqual([]);
  });

  it('refuses an unknown field on every body, naming it, and changes nothing', async () => {
    for (const [call, field] of [
      [() => admin.post(base, { name: 'typo', type: 'NODE', label: ['a'] }), 'label'],
      [() => admin.put(`${base}/${schemaId}`, { previewFeild: 'title' }), 'previewFeild'],
      [() => admin.put(`${base}/${schemaId}`, { description: 'x', id: schemaId }), 'id'],
      [() => admin.put(`${base}/${schemaId}/name`, { name: 'renamed', type: 'ROOT' }), 'type'],
    ] as const) {
      const response = await call();
      expect(response.statusCode, field).toBe(400);
      expect(response.body, field).toContain(field);
    }
    expect((await admin.get(`${base}/${schemaId}`)).json()).toMatchObject({ name: 'card', displayName: 'Card' });
    expect((await admin.get(`${base}/${schemaId}`)).json().description).toBeUndefined();
    expect((await admin.get(base)).json().map((it: { name: string }) => it.name)).toEqual(['card']);
  });
});
