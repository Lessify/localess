import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FIREBASE_IMPORT_STAGES } from '@localess/shared';
import { newUuid } from '../src/infra/database/id.js';
import { firebaseImports, spaces } from '../src/infra/database/schema.js';
import { FirebaseClient } from '../src/modules/firebase-import/firebase-client.js';
import { FirebaseImportRunner } from '../src/modules/firebase-import/firebase-import.runner.js';
import { FirebaseImportService } from '../src/modules/firebase-import/firebase-import.service.js';
import { fakeFirebase } from './fake-firebase.js';
import { api, createTestApp, TestApp, userWithAccess } from './test-app.js';

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
    admin = api(t, await userWithAccess(t, 'admin@example.com', { role: 'admin' }));
    manager = api(t, await userWithAccess(t, 'manager@example.com', { role: 'custom', permissions: ['SPACE_MANAGEMENT'] }));
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
    expect(run).toMatchObject({ status: 'FINISHED', sourceSpaceId: 'fbA', sourceSpaceName: 'Site A', startedBy: { email: 'admin@example.com' } });
    const again = (await admin.post(`${base}/spaces`, connection())).json();
    expect(again[0].importedAs).toEqual({ id: run.spaceId, name: 'Site A' });
    expect((await admin.post(base, { ...connection(), spaceId: 'fbA' })).statusCode).toBe(409);
    expect((await admin.get(base)).json()[0]).toMatchObject({ id: run.id });
    const rows = await t.db.select().from(firebaseImports);
    expect(JSON.stringify(rows)).not.toContain('migration-secret');
  });

  it('refuses a second import while one is running', async () => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id, origin: 'https://other.example.com', sourceSpaceId: 'x', sourceSpaceName: 'x', status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Other', email: 'other@example.com' },
    });
    expect((await admin.post(base, { ...connection(), spaceId: 'fbB' })).statusCode).toBe(409);
    await t.db.delete(firebaseImports).where(eq(firebaseImports.id, id));
  });

  it('leaves a run alone while its heartbeat is fresh (another instance is running it)', async () => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id, origin: fake.url, sourceSpaceId: 'fbB', sourceSpaceName: 'Site B', status: 'RUNNING', heartbeatAt: new Date(),
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
      id, origin: fake.url, sourceSpaceId: 'fbB', sourceSpaceName: 'Site B', status: 'FAILED',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(fake.url, 'migration-secret', { allowInternal: true }), 'fbB');
    expect((await admin.get(`${base}/${id}`)).json()).toMatchObject({ status: 'FAILED', stages: expect.arrayContaining([{ stage: 'space', status: 'PENDING', count: 0 }]) });
    expect(await t.db.select().from(spaces).where(eq(spaces.legacyId, 'fbB'))).toEqual([]);
  });

  it('marks a run interrupted by a restart as failed', async () => {
    const id = newUuid();
    const spaceId = newUuid();
    await t.db.insert(spaces).values({ id: spaceId, name: 'Half', locales: [{ id: 'en', name: 'English' }], localeFallback: { id: 'en', name: 'English' }, importStatus: 'IMPORTING' });
    await t.db.insert(firebaseImports).values({
      id, origin: fake.url, sourceSpaceId: 'fbB', sourceSpaceName: 'Site B', spaceId, status: 'RUNNING',
      // Its instance stopped long ago.
      heartbeatAt: new Date(Date.now() - 10 * 60 * 1000),
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: stage === 'space' ? ('DONE' as const) : stage === 'locales' ? ('RUNNING' as const) : ('PENDING' as const), count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportService).failInterrupted();
    const run = (await admin.get(`${base}/${id}`)).json();
    expect(run).toMatchObject({ status: 'FAILED', error: { stage: 'locales', message: 'Interrupted: the server running it stopped' } });
    expect((await t.db.select().from(spaces).where(eq(spaces.id, spaceId)))[0].importStatus).toBe('FAILED');
  });
});
