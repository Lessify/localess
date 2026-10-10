import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FIREBASE_IMPORT_STAGES } from '@localess/shared';
import { newUuid } from '../src/infra/database/id.js';
import { assets, contents, firebaseImports, schemas, spaces, tokens, translations, webhooks } from '../src/infra/database/schema.js';
import { FirebaseClient } from '../src/modules/firebase-import/firebase-client.js';
import { FirebaseImportRunner } from '../src/modules/firebase-import/firebase-import.runner.js';
import { fakeFirebase, FakeFirebaseSpace } from './fake-firebase.js';
import { UUID_V7 } from './ids.js';
import { createTestApp, TestApp } from './test-app.js';

const photo = Buffer.from('photo-bytes');
const site: FakeFirebaseSpace = {
  id: 'fbSpace',
  name: 'Site',
  doc: {
    locales: [{ id: 'en', name: 'English' }, { id: 'de', name: 'German' }],
    localeFallback: { id: 'en', name: 'English' },
    environments: [{ name: 'Preview', url: 'https://preview.example.com' }],
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  tokens: [
    { id: 'TOKENV1000000000000A', name: 'legacy', createdAt: '2025-01-02T00:00:00.000Z' },
    { id: 'TOKENV2000000000000B', name: 'web', version: 2, permissions: ['CONTENT_PUBLIC'], createdAt: '2025-01-02T00:00:00.000Z' },
  ],
  webhooks: [{ id: 'w1', name: 'Site', url: 'https://example.com/hook', enabled: true, events: ['content.published'], secret: 's' }],
  schemas: [{ id: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT', translatable: true }] }],
  translations: [{ id: 'greeting', type: 'STRING', locales: { en: 'Hello' } }, { id: 'bye', type: 'STRING', locales: { en: 'Bye' } }],
  assets: [
    { id: 'f1', kind: 'FOLDER', name: 'Photos', parentPath: '' },
    { id: 'a1', kind: 'FILE', name: 'photo', parentPath: 'f1', extension: '.jpg', type: 'image/jpeg', size: photo.length, createdAt: '2025-02-01T00:00:00.000Z' },
    { id: 'a2', kind: 'FILE', name: 'missing', parentPath: 'gone', extension: '.jpg', type: 'image/jpeg', size: 1 },
  ],
  contents: [
    { id: 'blog', kind: 'FOLDER', name: 'Blog', slug: 'blog', parentSlug: '', fullSlug: 'blog' },
    {
      id: 'post',
      kind: 'DOCUMENT',
      name: 'Post',
      slug: 'post',
      parentSlug: 'blog',
      fullSlug: 'blog/post',
      schema: 'page',
      publishedAt: '2025-03-01T00:00:00.000Z',
      data: JSON.stringify({ _id: 'r', _schema: 'page', title: 'Hi', hero: { kind: 'ASSET', uri: 'a1' }, next: { kind: 'LINK', type: 'content', uri: 'home' }, lost: { kind: 'REFERENCE', uri: 'deleted' } }),
      assets: ['a1'],
      links: ['home'],
      references: ['deleted'],
    },
    { id: 'home', kind: 'DOCUMENT', name: 'Home', slug: 'home', parentSlug: '', fullSlug: 'home', schema: 'page', data: '{not json' },
  ],
  files: { a1: photo },
};

describe('Firebase import run', () => {
  let t: TestApp;
  let fake: Awaited<ReturnType<typeof fakeFirebase>>;

  beforeAll(async () => {
    t = await createTestApp();
    fake = await fakeFirebase([site, { id: 'empty', name: 'Empty', doc: { locales: [], createdAt: '2025-01-01T00:00:00.000Z' } }]);
  });
  afterAll(async () => {
    await t?.close();
    await fake?.close();
  });

  const start = async (sourceSpaceId: string) => {
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: fake.url,
      sourceSpaceId,
      sourceSpaceName: sourceSpaceId,
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(fake.url, 'migration-secret', { allowInternal: true }), sourceSpaceId);
    return (await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id)))[0];
  };

  it('imports a space stage by stage', async () => {
    const run = await start('fbSpace');
    expect(run.status).toBe('FINISHED');
    const counts = Object.fromEntries(run.stages.map(it => [it.stage, [it.status, it.count]]));
    expect(counts).toEqual({
      space: ['DONE', 1],
      locales: ['DONE', 2],
      environments: ['DONE', 1],
      tokens: ['DONE', 2],
      webhooks: ['DONE', 1],
      translations: ['DONE', 2],
      schemas: ['DONE', 1],
      assets: ['DONE', 3],
      contents: ['DONE', 3],
      contentMigration: ['DONE', 1],
    });

    const [space] = await t.db.select().from(spaces).where(eq(spaces.id, run.spaceId!));
    expect(space).toMatchObject({ name: 'Site', legacyId: 'fbSpace', importStatus: null, environments: [{ name: 'Preview', url: 'https://preview.example.com' }] });

    expect((await t.db.select().from(tokens).where(eq(tokens.spaceId, space.id))).map(it => it.token).sort()).toEqual(['TOKENV1000000000000A', 'TOKENV2000000000000B']);
    expect((await t.db.select().from(webhooks).where(eq(webhooks.spaceId, space.id)))[0]).toMatchObject({ enabled: false, secret: 's' });
    expect((await t.db.select().from(translations).where(eq(translations.spaceId, space.id))).map(it => it.key).sort()).toEqual(['bye', 'greeting']);
    expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, space.id)))[0].name).toBe('page');

    const rows = await t.db.select().from(assets).where(eq(assets.spaceId, space.id));
    const folder = rows.find(it => it.legacyId === 'f1')!;
    const file = rows.find(it => it.legacyId === 'a1')!;
    expect(file).toMatchObject({ id: expect.stringMatching(UUID_V7), parentPath: folder.id, md5: createHash('md5').update(photo).digest('base64') });
    const served = await t.request({ method: 'GET', url: `/api/v1/spaces/${space.id}/assets/${file.id}/original` });
    expect(served.rawPayload.equals(photo)).toBe(true);

    const docs = await t.db.select().from(contents).where(eq(contents.spaceId, space.id));
    const post = docs.find(it => it.fullSlug === 'blog/post')!;
    const home = docs.find(it => it.fullSlug === 'home')!;
    expect(post.publishedAt).toBeNull();
    expect(post.data).toMatchObject({ hero: { kind: 'ASSET', uri: file.id }, next: { kind: 'LINK', type: 'content', uri: home.id }, lost: { kind: 'REFERENCE', uri: 'deleted' } });
    expect(post).toMatchObject({ assets: [file.id], links: [home.id], references: ['deleted'] });

    const warnings = run.stages.flatMap(it => it.warnings ?? []).join('\n');
    expect(warnings).toMatch(/missing: no file/); // a2 has no file in Firebase
    expect(warnings).toMatch(/keeps an unmapped parent folder 'gone'/); // a2's parent folder is missing
    expect(warnings).toMatch(/home: data is not valid JSON/);
    expect(warnings).toMatch(/blog\/post: no content 'deleted'/);
  });

  it('rewrites references that cross page boundaries (one document per page)', async () => {
    const paged = await fakeFirebase([{ ...site, id: 'fbPaged', tokens: [] }], { pageSize: 1 });
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id, origin: paged.url, sourceSpaceId: 'fbPaged', sourceSpaceName: 'Site', status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(paged.url, 'migration-secret', { allowInternal: true }), 'fbPaged');
    await paged.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run.status).toBe('FINISHED');
    const docs = await t.db.select().from(contents).where(eq(contents.spaceId, run.spaceId!));
    const home = docs.find(it => it.fullSlug === 'home')!;
    const post = docs.find(it => it.fullSlug === 'blog/post')!;
    expect(post.data).toMatchObject({ next: { kind: 'LINK', type: 'content', uri: home.id } });
    expect(run.stages.find(it => it.stage === 'contents')!.count).toBe(3);
  });

  it('imports an empty space', async () => {
    const run = await start('empty');
    expect(run.status).toBe('FINISHED');
    expect(run.stages.every(it => it.status === 'DONE')).toBe(true);
    expect(run.stages.find(it => it.stage === 'contents')!.count).toBe(0);
  });

  it('fails at tokens when a token value already belongs to another space', async () => {
    const twin = await fakeFirebase([{ ...site, id: 'fbTwin' }]);
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: twin.url,
      sourceSpaceId: 'fbTwin',
      sourceSpaceName: 'Site',
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(twin.url, 'migration-secret', { allowInternal: true }), 'fbTwin');
    await twin.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run).toMatchObject({ status: 'FAILED', error: { stage: 'tokens', message: "Token 'legacy' already exists in space 'Site'" } });
  });

  it('records the failing stage and keeps the space flagged', async () => {
    // No tokens: the first test already imported this fixture's token values.
    const failing = await fakeFirebase([{ ...site, id: 'fbFail', tokens: [] }], { failAfterFiles: 0 });
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id, origin: failing.url, sourceSpaceId: 'fbFail', sourceSpaceName: 'Site', status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(failing.url, 'migration-secret', { allowInternal: true }), 'fbFail');
    await failing.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run.status).toBe('FAILED');
    expect(run.error).toMatchObject({ stage: 'assets', message: expect.stringContaining('asset') });
    expect(run.stages.find(it => it.stage === 'translations')!.status).toBe('DONE');
    expect(run.stages.find(it => it.stage === 'assets')!.status).toBe('FAILED');
    expect(run.stages.find(it => it.stage === 'contents')!.status).toBe('PENDING');
    const [space] = await t.db.select().from(spaces).where(eq(spaces.id, run.spaceId!));
    expect(space.importStatus).toBe('FAILED');
  });
});
