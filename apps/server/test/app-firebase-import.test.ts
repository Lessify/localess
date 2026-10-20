import { FIREBASE_IMPORT_STAGES } from '@localess/shared';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { firebaseImports } from '../src/infra/database/schema.js';
import { FirebaseImportService } from '../src/modules/firebase-import/services/firebase-import.service.js';
import { FirebaseClient } from '../src/modules/firebase-import/utils/firebase-client.js';
import { FirebaseImportRunner } from '../src/modules/firebase-import/workers/firebase-import.runner.js';
import { fakeFirebase } from './fake-firebase.js';
import { api, createTestApp, insertSpace, readSpaces, TestApp, userWithAccess } from './test-app.js';

const base = '/api/app/admin/firebase-import';

describe('app API: import from Firebase', () => {
  let t: TestApp;
  let admin: ReturnType<typeof api>;
  let manager: ReturnType<typeof api>;
  let fake: Awaited<ReturnType<typeof fakeFirebase>>;

  beforeAll(async () => {
    fake = await fakeFirebase([
      { id: 'fbA', name: 'Site A', doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' } },
      { id: 'fbB', name: 'Site B', doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' } },
    ]);
    // The fake Firebase environment runs on 127.0.0.1.
    t = await createTestApp({ LOCALESS_WEBHOOK_ALLOW_INTERNAL: 'true' });
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'DEVELOPER' }));
  });
  afterAll(async () => {
    await t?.close();
    await fake?.close();
  });

  const connection = () => ({ origin: fake.url, token: 'migration-secret' });
  const waitFor = async (id: string) => {
    for (let i = 0; i < 100; i++) {
      const run = (await admin.get(`${base}/${id}`)).json();
      if (run.status !== 'RUNNING') return run;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('import did not finish');
  };

  it("keeps a failed run's error on its stage only, and no index for the history list", async () => {
    const columns = await t.db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns where table_name = 'firebase_imports'`,
    );
    expect(columns.rows.map(it => it.column_name)).not.toContain('error');
    const indexes = await t.db.execute<{ indexname: string }>(sql`select indexname from pg_indexes where tablename = 'firebase_imports'`);
    expect(indexes.rows.map(it => it.indexname)).not.toContain('firebase_imports_started_idx');
  });

  it('is for admins only', async () => {
    expect((await manager.post(`${base}/spaces`, connection())).statusCode).toBe(403);
    expect((await manager.get(base)).statusCode).toBe(403);
  });

  it('names connection failures with 502', async () => {
    const wrong = await admin.post(`${base}/spaces`, { origin: fake.url, token: 'wrong' });
    expect(wrong.statusCode).toBe(502);
    expect(wrong.json().message).toMatch(/token was refused/);
    expect((await admin.post(`${base}/spaces`, { origin: 'http://127.0.0.1:1', token: 'x' })).statusCode).toBe(502);
    expect((await admin.post(`${base}/spaces`, { origin: 'ftp://cms.example.com', token: 'x' })).statusCode).toBe(400);
  });

  it('lists the spaces, imports one, then marks it imported', async () => {
    const list = (await admin.post(`${base}/spaces`, connection())).json();
    expect(list).toEqual([
      { id: 'fbA', name: 'Site A', createdAt: '2025-01-01T00:00:00.000Z', importedAs: null },
      { id: 'fbB', name: 'Site B', createdAt: '2025-01-01T00:00:00.000Z', importedAs: null },
    ]);
    const started = await admin.post(base, { ...connection(), spaceId: 'fbA' });
    expect(started.statusCode).toBe(202);
    expect(started.json()).not.toHaveProperty('token');
    const run = await waitFor(started.json().id);
    expect(run).toMatchObject({
      status: 'FINISHED',
      sourceSpaceId: 'fbA',
      sourceSpaceName: 'Site A',
      startedBy: { email: 'admin@example.com' },
    });
    const again = (await admin.post(`${base}/spaces`, connection())).json();
    expect(again[0].importedAs).toEqual({ id: run.spaceId, name: 'Site A' });
    expect((await admin.post(base, { ...connection(), spaceId: 'fbA' })).statusCode).toBe(409);
    expect((await admin.get(base)).json()[0]).toMatchObject({ id: run.id });
    const rows = await t.db.select().from(firebaseImports);
    expect(JSON.stringify(rows)).not.toContain('migration-secret');
  });

  it('deleting the imported space deletes its import, and the Firebase space can be imported again', async () => {
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.sourceSpaceId, 'fbA'));
    expect((await admin.delete(`/api/app/spaces/${run.spaceId}`)).statusCode).toBe(204);
    expect(await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, run.id))).toEqual([]);
    expect((await admin.post(`${base}/spaces`, connection())).json()[0].importedAs).toBeNull();
    const again = await waitFor((await admin.post(base, { ...connection(), spaceId: 'fbA' })).json().id);
    expect(again).toMatchObject({ status: 'FINISHED', sourceSpaceId: 'fbA' });
    expect(again.spaceId).not.toBe(run.spaceId);
  });

  it('refuses a second import while one is running', async () => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: 'https://other.example.com',
      sourceSpaceId: 'x',
      sourceSpaceName: 'x',
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Other', email: 'other@example.com' },
    });
    expect((await admin.post(base, { ...connection(), spaceId: 'fbB' })).statusCode).toBe(409);
    await t.db.delete(firebaseImports).where(eq(firebaseImports.id, id));
  });

  it('leaves a run alone while its heartbeat is fresh (another instance is running it)', async () => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: fake.url,
      sourceSpaceId: 'fbB',
      sourceSpaceName: 'Site B',
      status: 'RUNNING',
      heartbeatAt: new Date(),
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportService).failInterrupted();
    expect((await admin.get(`${base}/${id}`)).json().status).toBe('RUNNING');
    await t.db.delete(firebaseImports).where(eq(firebaseImports.id, id));
  });

  it('a runner stops without writing once its run is no longer RUNNING', async () => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: fake.url,
      sourceSpaceId: 'fbB',
      sourceSpaceName: 'Site B',
      status: 'FAILED',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(fake.url, 'migration-secret', { allowInternal: true }), 'fbB');
    expect((await admin.get(`${base}/${id}`)).json()).toMatchObject({
      status: 'FAILED',
      stages: expect.arrayContaining([{ stage: 'space', status: 'PENDING', count: 0 }]),
    });
    expect((await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id)))[0].spaceId).toBeNull();
  });

  it('marks a run interrupted by a restart as failed', async () => {
    const id = newUuid();
    const spaceId = newUuid();
    await insertSpace(t.db, {
      id: spaceId,
      name: 'Half',
      locales: [{ id: 'en', name: 'English' }],
      defaultLocale: { id: 'en', name: 'English' },
    });
    await t.db.insert(firebaseImports).values({
      id,
      origin: fake.url,
      sourceSpaceId: 'fbB',
      sourceSpaceName: 'Site B',
      spaceId,
      status: 'RUNNING',
      // Its instance stopped long ago.
      heartbeatAt: new Date(Date.now() - 10 * 60 * 1000),
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({
        stage,
        status: stage === 'space' ? ('DONE' as const) : stage === 'locales' ? ('RUNNING' as const) : ('PENDING' as const),
        count: 0,
      })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportService).failInterrupted();
    const run = (await admin.get(`${base}/${id}`)).json();
    expect(run).toMatchObject({ status: 'FAILED', error: { stage: 'locales', message: 'Interrupted: the server running it stopped' } });
    expect((await readSpaces(t.db, spaceId))[0].importStatus).toBe('FAILED');
  });

  describe('cancel', () => {
    const running = async (status: 'RUNNING' | 'FINISHED' = 'RUNNING') => {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: fake.url,
        sourceSpaceId: 'fbB',
        sourceSpaceName: 'Site B',
        status,
        heartbeatAt: new Date(),
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({
          stage,
          status: stage === 'space' ? ('DONE' as const) : stage === 'locales' ? ('RUNNING' as const) : ('PENDING' as const),
          count: 0,
        })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      return id;
    };

    it('fails a running import at the stage it reached, naming who cancelled it', async () => {
      const id = await running();
      const response = await admin.post(`${base}/${id}/cancel`, {});
      expect(response.statusCode).toBe(200);
      const message = 'Cancelled by admin@example.com';
      expect(response.json()).toMatchObject({ id, status: 'FAILED', error: { stage: 'locales', message } });
      expect(response.json().finishedAt).toEqual(expect.any(String));
      expect(response.json().stages).toEqual(expect.arrayContaining([{ stage: 'locales', status: 'FAILED', count: 0, error: message }]));
      await t.db.delete(firebaseImports).where(eq(firebaseImports.id, id));
    });

    it('answers 409 for an import that is no longer running, 404 for an unknown one, 403 for non-admins', async () => {
      const id = await running('FINISHED');
      const ended = await admin.post(`${base}/${id}/cancel`, {});
      expect(ended.statusCode).toBe(409);
      expect(ended.json().message).toBe('The import is not running');
      expect((await admin.post(`${base}/${newUuid()}/cancel`, {})).statusCode).toBe(404);
      expect((await manager.post(`${base}/${id}/cancel`, {})).statusCode).toBe(403);
      await t.db.delete(firebaseImports).where(eq(firebaseImports.id, id));
    });
  });
});
