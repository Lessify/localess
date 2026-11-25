import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { tasks } from '../src/infra/database/schema.js';
import { S1 } from './ids.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess } from './test-app.js';

const en = { id: 'en', name: 'English' };
const base = `/api/app/spaces/${S1}/tasks`;

describe('app API: tasks, each role sees the kinds it may start', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let developer: ReturnType<typeof api>;
  let editor: ReturnType<typeof api>;
  let translator: ReturnType<typeof api>;
  let viewer: ReturnType<typeof api>;
  const schemaTask = newUuid();

  beforeAll(async () => {
    // The worker is off: the tasks stay as inserted.
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    await insertSpace(t.db, { id: S1, name: 'S', locales: [en, { id: 'de', name: 'German' }], defaultLocale: en });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    developer = api(t, await userWithAccess(t, 'developer@example.com', { role: 'DEVELOPER' }));
    editor = api(t, await userWithAccess(t, 'editor@example.com', { role: 'EDITOR' }));
    translator = api(t, await userWithAccess(t, 'translator@example.com', { role: 'TRANSLATOR' }));
    viewer = api(t, await userWithAccess(t, 'viewer@example.com', { role: 'VIEWER' }));
    await t.db.insert(tasks).values([
      { id: schemaTask, spaceId: S1, kind: 'SCHEMA_EXPORT', status: 'FINISHED', createdAt: new Date('2026-01-01') },
      { id: newUuid(), spaceId: S1, kind: 'TRANSLATION_EXPORT', status: 'FINISHED', createdAt: new Date('2026-01-02') },
      {
        id: newUuid(),
        spaceId: S1,
        kind: 'TRANSLATION_TRANSLATE',
        status: 'FINISHED',
        params: { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de', overwrite: false },
        createdAt: new Date('2026-01-03'),
      },
      { id: newUuid(), spaceId: S1, kind: 'ASSET_REGEN_METADATA', status: 'FINISHED', createdAt: new Date('2026-01-04') },
    ]);
  });

  afterAll(() => t?.close());

  const kinds = async (user: ReturnType<typeof api>, query = '') =>
    ((await user.get(`${base}${query}`)).json().items as { kind: string }[]).map(it => it.kind).sort();

  it('each role lists only the kinds it may start', async () => {
    expect(await kinds(translator)).toEqual(['TRANSLATION_TRANSLATE']);
    expect(await kinds(editor)).toEqual(['TRANSLATION_EXPORT', 'TRANSLATION_TRANSLATE']);
    expect(await kinds(developer)).toEqual(['SCHEMA_EXPORT', 'TRANSLATION_EXPORT', 'TRANSLATION_TRANSLATE']);
    expect(await kinds(admin)).toEqual(['ASSET_REGEN_METADATA', 'SCHEMA_EXPORT', 'TRANSLATION_EXPORT', 'TRANSLATION_TRANSLATE']);
  });

  it('counts only those kinds', async () => {
    expect((await editor.get(base)).json().total).toBe(2);
  });

  it('another kind is 404: the task, its logs, its file', async () => {
    for (const path of ['', '/logs', '/download']) {
      expect((await editor.get(`${base}/${schemaTask}${path}`)).statusCode).toBe(404);
    }
    expect((await developer.get(`${base}/${schemaTask}`)).statusCode).toBe(200);
  });

  it('a kind filter outside the role answers an empty page', async () => {
    expect((await editor.get(`${base}?kind=SCHEMA_EXPORT`)).json()).toMatchObject({ items: [], total: 0 });
    expect(await kinds(editor, '?kind=SCHEMA_EXPORT&kind=TRANSLATION_EXPORT')).toEqual(['TRANSLATION_EXPORT']);
  });

  it('a viewer reads no tasks', async () => {
    expect((await viewer.get(base)).statusCode).toBe(403);
  });

  it('records who started a task', async () => {
    const created = await editor.post(base, { kind: 'TRANSLATION_EXPORT' });
    expect(created.statusCode).toBe(201);
    expect(created.json().createdBy).toMatchObject({ email: 'editor@example.com' });
    expect((await editor.get(`${base}/${created.json().id}`)).json().createdBy).toMatchObject({ email: 'editor@example.com' });
  });

  it('refuses to delete a task that is queued or running (409), so its space never runs two', async () => {
    for (const status of ['QUEUED', 'IN_PROGRESS'] as const) {
      const id = newUuid();
      await t.db.insert(tasks).values({ id, spaceId: S1, kind: 'TRANSLATION_EXPORT', status });
      const response = await editor.delete(`${base}/${id}`);
      expect(response.statusCode).toBe(409);
      expect((await editor.get(`${base}/${id}`)).statusCode).toBe(200);
      await t.db.update(tasks).set({ status: 'FINISHED' }).where(eq(tasks.id, id));
      expect((await editor.delete(`${base}/${id}`)).statusCode).toBe(204);
    }
  });
});
