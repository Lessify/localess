import { createHash } from 'node:crypto';

import { FIREBASE_IMPORT_STAGES } from '@localess/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { assets, contents, firebaseImports, schemas, tokens, translations, webhooks } from '../src/infra/database/schema.js';
import { FirebaseClient } from '../src/modules/firebase-import/utils/firebase-client.js';
import { FirebaseImportRunner } from '../src/modules/firebase-import/workers/firebase-import.runner.js';
import { toFirebaseImport } from '../src/shared/transformers/firebase-import.transformer.js';
import { fakeFirebase, FakeFirebaseSpace } from './fake-firebase.js';
import { UUID_V7 } from './ids.js';
import { createTestApp, readSpaces, TestApp } from './test-app.js';

const photo = Buffer.from('photo-bytes');
const site: FakeFirebaseSpace = {
  id: 'fbSpace',
  name: 'Site',
  doc: {
    locales: [
      { id: 'en', name: 'English' },
      { id: 'de', name: 'German' },
    ],
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
  translations: [
    { id: 'greeting', type: 'STRING', locales: { en: 'Hello' } },
    { id: 'bye', type: 'STRING', locales: { en: 'Bye' } },
  ],
  assets: [
    // Before its folder: Firestore pages come in no tree order.
    {
      id: 'a1',
      kind: 'FILE',
      name: 'photo',
      parentPath: 'f1/f2',
      extension: '.jpg',
      type: 'image/jpeg',
      size: photo.length,
      createdAt: '2025-02-01T00:00:00.000Z',
    },
    { id: 'f2', kind: 'FOLDER', name: '2025', parentPath: 'f1' },
    { id: 'f1', kind: 'FOLDER', name: 'Photos', parentPath: '' },
    { id: 'a2', kind: 'FILE', name: 'missing', parentPath: 'gone', extension: '.jpg', type: 'image/jpeg', size: 1 },
  ],
  contents: [
    {
      id: 'post',
      kind: 'DOCUMENT',
      name: 'Post',
      slug: 'post',
      parentSlug: 'blog',
      fullSlug: 'blog/post',
      schema: 'page',
      publishedAt: '2025-03-01T00:00:00.000Z',
      updatedAt: '2025-02-15T00:00:00.000Z',
      data: JSON.stringify({
        _id: 'r',
        _schema: 'page',
        title: 'Hi',
        hero: { kind: 'ASSET', uri: 'a1' },
        next: { kind: 'LINK', type: 'content', uri: 'home' },
        lost: { kind: 'REFERENCE', uri: 'deleted' },
      }),
      assets: ['a1'],
      links: ['home'],
      references: ['deleted'],
    },
    { id: 'home', kind: 'DOCUMENT', name: 'Home', slug: 'home', parentSlug: '', fullSlug: 'home', schema: 'page', data: '{not json' },
    {
      id: 'lost',
      kind: 'DOCUMENT',
      name: 'Lost',
      slug: 'lost',
      parentSlug: 'nowhere',
      fullSlug: 'nowhere/lost',
      schema: 'page',
      data: '{}',
    },
    // After its children: Firestore pages come in no tree order.
    { id: 'blog', kind: 'FOLDER', name: 'Blog', slug: 'blog', parentSlug: '', fullSlug: 'blog' },
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
    await t.app
      .get(FirebaseImportRunner)
      .execute(id, new FirebaseClient(fake.url, 'migration-secret', { allowInternal: true }), sourceSpaceId);
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
      webhooks: ['DONE', 1],
      translations: ['DONE', 2],
      schemas: ['DONE', 1],
      assets: ['DONE', 4],
      contents: ['DONE', 4],
      contentMigration: ['DONE', 1],
    });

    const [space] = await readSpaces(t.db, run.spaceId!);
    expect(space).toMatchObject({
      name: 'Site',
      legacyId: 'fbSpace',
      importStatus: null,
      environments: [{ id: expect.stringMatching(UUID_V7), name: 'Preview', url: 'https://preview.example.com' }],
    });

    // Tokens are not imported (their values are the old format): the space gets its own preview token instead.
    expect(FIREBASE_IMPORT_STAGES).not.toContain('tokens');
    const spaceTokens = await t.db.select().from(tokens).where(eq(tokens.spaceId, space.id));
    expect(spaceTokens).toHaveLength(1);
    expect(spaceTokens[0]).toMatchObject({ type: 'preview', name: 'Auto Generated Preview Token' });
    expect((await t.db.select().from(webhooks).where(eq(webhooks.spaceId, space.id)))[0]).toMatchObject({
      enabled: false,
      secret: `whsec_${Buffer.from('s').toString('base64')}`,
    });
    expect((await t.db.select().from(translations).where(eq(translations.spaceId, space.id))).map(it => it.key).sort()).toEqual([
      'bye',
      'greeting',
    ]);
    expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, space.id)))[0].name).toBe('page');

    const rows = await t.db.select().from(assets).where(eq(assets.spaceId, space.id));
    const photos = rows.find(it => it.legacyId === 'f1')!;
    const folder = rows.find(it => it.legacyId === 'f2')!;
    const file = rows.find(it => it.legacyId === 'a1')!;
    expect(photos.parentId).toBeNull();
    expect(folder.parentId).toBe(photos.id);
    expect(file).toMatchObject({
      id: expect.stringMatching(UUID_V7),
      parentId: folder.id,
      md5: createHash('md5').update(photo).digest('base64'),
      // Stored by its Firebase name and extension, made safe; set for a file Firebase had no bytes for, too.
      originalName: 'photo.jpg',
    });
    expect(rows.find(it => it.legacyId === 'a2')).toMatchObject({ parentId: null, originalName: 'missing.jpg' });
    expect(photos.originalName).toBeNull();
    const served = await t.request({ method: 'GET', url: `/api/v1/spaces/${space.id}/assets/${file.id}/original` });
    expect(served.rawPayload.equals(photo)).toBe(true);

    const docs = await t.db.select().from(contents).where(eq(contents.spaceId, space.id));
    const blog = docs.find(it => it.slug === 'blog')!;
    const post = docs.find(it => it.slug === 'post')!;
    const home = docs.find(it => it.slug === 'home')!;
    // The tree is linked after the last page, by the Firebase paths.
    expect(blog).toMatchObject({ kind: 'FOLDER', parentId: null });
    expect(post.parentId).toBe(blog.id);
    expect(home.parentId).toBeNull();
    expect(docs.find(it => it.slug === 'lost')).toMatchObject({ parentId: null });
    expect(post.publishedAt).toBeNull();
    // Rewriting its references is not an edit: it keeps the date it had in Firebase.
    expect(post.updatedAt).toEqual(new Date('2025-02-15T00:00:00.000Z'));
    expect(post.data).toMatchObject({
      hero: { kind: 'ASSET', uri: file.id },
      next: { kind: 'LINK', type: 'content', uri: home.id },
      lost: { kind: 'REFERENCE', uri: 'deleted' },
    });
    expect(post).toMatchObject({ assets: [file.id], links: [home.id], references: ['deleted'] });

    const warnings = run.stages.flatMap(it => it.warnings ?? []).join('\n');
    expect(warnings).toMatch(/missing: no file/); // a2 has no file in Firebase
    expect(warnings).toMatch(/Site: signed; regenerate its secret/);
    expect(warnings).toMatch(/missing: parent folder 'gone' not found, imported at the root/);
    expect(warnings).toMatch(/home: data is not valid JSON/);
    expect(warnings).toMatch(/blog\/post: no content 'deleted'/);
    expect(warnings).toMatch(/nowhere\/lost: parent folder 'nowhere' not found, imported at the root/);
  });

  it('rewrites references that cross page boundaries (one document per page)', async () => {
    const paged = await fakeFirebase([{ ...site, id: 'fbPaged' }], { pageSize: 1 });
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: paged.url,
      sourceSpaceId: 'fbPaged',
      sourceSpaceName: 'Site',
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app
      .get(FirebaseImportRunner)
      .execute(id, new FirebaseClient(paged.url, 'migration-secret', { allowInternal: true }), 'fbPaged');
    await paged.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run.status).toBe('FINISHED');
    const docs = await t.db.select().from(contents).where(eq(contents.spaceId, run.spaceId!));
    const home = docs.find(it => it.slug === 'home')!;
    const post = docs.find(it => it.slug === 'post')!;
    expect(post.data).toMatchObject({ next: { kind: 'LINK', type: 'content', uri: home.id } });
    expect(post.parentId).toBe(docs.find(it => it.slug === 'blog')!.id);
    expect(run.stages.find(it => it.stage === 'contents')!.count).toBe(4);
  });

  it('imports an empty space', async () => {
    const run = await start('empty');
    expect(run.status).toBe('FINISHED');
    expect(run.stages.every(it => it.status === 'DONE')).toBe(true);
    expect(run.stages.find(it => it.stage === 'contents')!.count).toBe(0);
    const [space] = await readSpaces(t.db, run.spaceId!);
    expect(space).toMatchObject({ locales: [{ id: 'en', name: 'English' }], defaultLocale: { id: 'en', name: 'English' } });
  });

  it('keeps only known enum values (webhook events, translation and schema types), with a warning', async () => {
    const odd = await fakeFirebase([
      {
        id: 'fbValues',
        name: 'Values',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        webhooks: [{ id: 'w9', name: 'Odd', url: 'https://example.com/hook', events: ['content.published', 'space.renamed'] }],
        // Translations are plain text: a Firebase type (PLURAL, ARRAY, anything) is dropped, the value kept as it is.
        translations: [{ id: 'odd', type: 'PLURAL', locales: { en: '{"0":"None","1":"One"}' } }],
        schemas: [{ id: 'odd', type: 'WIDGET' }],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: odd.url,
        sourceSpaceId: 'fbValues',
        sourceSpaceName: 'Values',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app
        .get(FirebaseImportRunner)
        .execute(id, new FirebaseClient(odd.url, 'migration-secret', { allowInternal: true }), 'fbValues');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const sid = run.spaceId!;
      expect((await t.db.select().from(webhooks).where(eq(webhooks.spaceId, sid)))[0].events).toEqual(['content.published']);
      expect((await t.db.select().from(translations).where(eq(translations.spaceId, sid)))[0].locales).toEqual({
        en: '{"0":"None","1":"One"}',
      });
      expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, sid)))[0].type).toBe('ROOT');
      const warnings = (name: string) => run.stages.find(it => it.stage === name)!.warnings?.join('\n');
      expect(warnings('webhooks')).toMatch(/Odd: unknown event space.renamed, dropped/);
      expect(warnings('translations')).toBeUndefined();
      expect(warnings('schemas')).toMatch(/odd: unknown type WIDGET, imported as ROOT/);
    } finally {
      await odd.close();
    }
  });

  it('drops schema fields and enum values that are not valid, and what a schema type does not have, with a warning', async () => {
    const odd = await fakeFirebase([
      {
        id: 'fbFields',
        name: 'Fields',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        schemas: [
          {
            id: 'page',
            type: 'ROOT',
            previewField: 'title',
            fields: [
              { name: 'title', kind: 'TEXT', translatable: true },
              { name: 'Bad Name', kind: 'TEXT' },
              { name: 'gadget', kind: 'WIDGET' },
              'not a field',
            ],
            values: [{ name: 'Red', value: 'red' }],
          },
          {
            id: 'colors',
            type: 'ENUM',
            fields: [{ name: 'title', kind: 'TEXT' }],
            previewField: 'title',
            values: [{ name: 'Red', value: 'red' }, { name: 'Blue' }],
          },
        ],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: odd.url,
        sourceSpaceId: 'fbFields',
        sourceSpaceName: 'Fields',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app
        .get(FirebaseImportRunner)
        .execute(id, new FirebaseClient(odd.url, 'migration-secret', { allowInternal: true }), 'fbFields');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const rows = await t.db.select().from(schemas).where(eq(schemas.spaceId, run.spaceId!)).orderBy(schemas.name);
      expect(rows.map(({ name, previewField, fields, values }) => ({ name, previewField, fields, values }))).toEqual([
        { name: 'colors', previewField: null, fields: null, values: [{ name: 'Red', value: 'red' }] },
        { name: 'page', previewField: 'title', fields: [{ name: 'title', kind: 'TEXT', translatable: true }], values: null },
      ]);
      const warnings = run.stages.find(it => it.stage === 'schemas')!.warnings;
      expect(warnings).toEqual([
        "page: field 'Bad Name' is not valid, dropped",
        "page: field 'gadget' is not valid, dropped",
        'page: field 4 is not valid, dropped',
        "colors: enum value 'Blue' is not valid, dropped",
      ]);
    } finally {
      await odd.close();
    }
  });

  it('imports a path used twice with a suffixed slug, with a warning', async () => {
    const twice = await fakeFirebase([
      {
        id: 'fbTwice',
        name: 'Twice',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        schemas: [{ id: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT' }] }],
        contents: [
          {
            id: 'c1',
            kind: 'DOCUMENT',
            name: 'First',
            slug: 'post',
            parentSlug: '',
            fullSlug: 'post',
            schema: 'page',
            data: '{"_id":"r1","_schema":"page"}',
          },
          {
            id: 'c2',
            kind: 'DOCUMENT',
            name: 'Second',
            slug: 'post',
            parentSlug: '',
            fullSlug: 'post',
            schema: 'page',
            data: '{"_id":"r2","_schema":"page"}',
          },
        ],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: twice.url,
        sourceSpaceId: 'fbTwice',
        sourceSpaceName: 'Twice',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app
        .get(FirebaseImportRunner)
        .execute(id, new FirebaseClient(twice.url, 'migration-secret', { allowInternal: true }), 'fbTwice');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const rows = await t.db.select().from(contents).where(eq(contents.spaceId, run.spaceId!));
      const first = rows.find(it => it.name === 'First')!;
      const second = rows.find(it => it.name === 'Second')!;
      expect(first).toMatchObject({ slug: 'post', parentId: null });
      expect(second).toMatchObject({ slug: expect.stringMatching(/^post-[a-z0-9]{5}$/), parentId: null });
      expect(run.stages.find(it => it.stage === 'contents')!.warnings).toEqual([`post: path used twice, imported as ${second.slug}`]);
    } finally {
      await twice.close();
    }
  });

  it('breaks a cycle of folders naming each other as parent, with a warning', async () => {
    const loop = await fakeFirebase([
      {
        id: 'fbLoop',
        name: 'Loop',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        contents: [
          { id: 'x', kind: 'FOLDER', name: 'X', slug: 'x', parentSlug: 'y', fullSlug: 'x' },
          { id: 'y', kind: 'FOLDER', name: 'Y', slug: 'y', parentSlug: 'x', fullSlug: 'y' },
        ],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: loop.url,
        sourceSpaceId: 'fbLoop',
        sourceSpaceName: 'Loop',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app
        .get(FirebaseImportRunner)
        .execute(id, new FirebaseClient(loop.url, 'migration-secret', { allowInternal: true }), 'fbLoop');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const rows = await t.db.select().from(contents).where(eq(contents.spaceId, run.spaceId!));
      const x = rows.find(it => it.name === 'X')!;
      const y = rows.find(it => it.name === 'Y')!;
      // The first one keeps its parent; the one that would close the loop goes to the root.
      expect(x.parentId).toBe(y.id);
      expect(y.parentId).toBeNull();
      expect(run.stages.find(it => it.stage === 'contents')!.warnings).toEqual([
        "y: parent folder 'x' would make a cycle, imported at the root",
      ]);
    } finally {
      await loop.close();
    }
  });

  it('breaks a loop of asset folders naming each other as parent, with a warning', async () => {
    const loop = await fakeFirebase([
      {
        id: 'fbAssetLoop',
        name: 'Asset loop',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        assets: [
          // X only waits on the loop: it keeps its parent P.
          { id: 'a', kind: 'FOLDER', name: 'X', parentPath: 'q/p' },
          { id: 'p', kind: 'FOLDER', name: 'P', parentPath: 'q' },
          { id: 'q', kind: 'FOLDER', name: 'Q', parentPath: 'p' },
        ],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: loop.url,
        sourceSpaceId: 'fbAssetLoop',
        sourceSpaceName: 'Asset loop',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app
        .get(FirebaseImportRunner)
        .execute(id, new FirebaseClient(loop.url, 'migration-secret', { allowInternal: true }), 'fbAssetLoop');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const rows = await t.db.select().from(assets).where(eq(assets.spaceId, run.spaceId!));
      const p = rows.find(it => it.name === 'P')!;
      const q = rows.find(it => it.name === 'Q')!;
      expect(p.parentId).toBeNull();
      expect(q.parentId).toBe(p.id);
      expect(rows.find(it => it.name === 'X')!.parentId).toBe(p.id);
      expect(run.stages.find(it => it.stage === 'assets')!.warnings).toEqual([
        "P: parent folder 'q' would make a cycle, imported at the root",
      ]);
    } finally {
      await loop.close();
    }
  });

  it('keeps content data to blocks of known values: legacy keys moved, a missing root filled, the rest dropped with a warning', async () => {
    const odd = await fakeFirebase([
      {
        id: 'fbData',
        name: 'Data',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        schemas: [{ id: 'page', type: 'ROOT', fields: [{ name: 'title', kind: 'TEXT' }] }],
        contents: [
          {
            id: 'c1',
            kind: 'DOCUMENT',
            name: 'Page',
            slug: 'page',
            parentSlug: '',
            fullSlug: 'page',
            schema: 'page',
            data: {
              title: 'Hello',
              empty: null,
              odd: { foo: 1 },
              legacy: { _id: 'b1', schema: 'card', label: 'Old block', bad: { foo: 2 } },
              blocks: [{ _id: 'b2', _schema: 'card' }],
              // Older links carry no target: the editor's default.
              cta: { kind: 'LINK', type: 'url', uri: 'https://example.com' },
            },
          },
        ],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: odd.url,
        sourceSpaceId: 'fbData',
        sourceSpaceName: 'Data',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(odd.url, 'migration-secret', { allowInternal: true }), 'fbData');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const [row] = await t.db.select().from(contents).where(eq(contents.spaceId, run.spaceId!));
      expect(row.data).toEqual({
        _id: expect.stringMatching(UUID_V7),
        _schema: 'page',
        title: 'Hello',
        legacy: { _id: 'b1', _schema: 'card', label: 'Old block' },
        blocks: [{ _id: 'b2', _schema: 'card' }],
        cta: { kind: 'LINK', type: 'url', target: '_self', uri: 'https://example.com' },
      });
      expect(run.stages.find(it => it.stage === 'contents')!.warnings).toEqual([
        'page: data has no _id or _schema, filled in',
        "page: 'odd' is not a known value, dropped",
        "page: 'legacy.bad' is not a known value, dropped",
      ]);
    } finally {
      await odd.close();
    }
  });

  it('fixes what breaks a rule across fields, with a warning', async () => {
    const odd = await fakeFirebase([
      {
        id: 'fbRules',
        name: 'Rules',
        doc: { locales: [{ id: 'en', name: 'English' }], createdAt: '2025-01-01T00:00:00.000Z' },
        schemas: [
          {
            id: 'page',
            type: 'ROOT',
            previewField: 'gone',
            fields: [
              { name: 'title', kind: 'TEXT' },
              { name: 'title', kind: 'TEXTAREA' },
              { name: 'items', kind: 'SCHEMAS', schemas: ['card', 'page', 'missing'] },
              { name: 'color', kind: 'OPTION', source: 'card' },
              { name: 'tint', kind: 'OPTIONS', source: 'colors' },
            ],
          },
          { id: 'card', type: 'NODE', previewField: 'body', fields: [{ name: 'body', kind: 'RICH_TEXT' }] },
          { id: 'colors', type: 'ENUM', values: [{ name: 'Red', value: 'red' }] },
        ],
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: odd.url,
        sourceSpaceId: 'fbRules',
        sourceSpaceName: 'Rules',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app
        .get(FirebaseImportRunner)
        .execute(id, new FirebaseClient(odd.url, 'migration-secret', { allowInternal: true }), 'fbRules');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const rows = await t.db.select().from(schemas).where(eq(schemas.spaceId, run.spaceId!)).orderBy(schemas.name);
      expect(rows.map(({ name, previewField, fields }) => ({ name, previewField, fields }))).toEqual([
        { name: 'card', previewField: null, fields: [{ name: 'body', kind: 'RICH_TEXT' }] },
        { name: 'colors', previewField: null, fields: null },
        {
          name: 'page',
          previewField: null,
          fields: [
            { name: 'title', kind: 'TEXT' },
            { name: 'items', kind: 'SCHEMAS', schemas: ['card'] },
            { name: 'tint', kind: 'OPTIONS', source: 'colors' },
          ],
        },
      ]);
      expect(run.stages.find(it => it.stage === 'schemas')!.warnings).toEqual([
        "page: field 'title' is defined more than once, the later one dropped",
        "page: field 'items' allows 'page', which is not a NODE schema, removed",
        "page: field 'items' allows 'missing', which does not exist, removed",
        "page: field 'color' takes its options from 'card', which is not an ENUM schema, dropped",
        "page: preview field 'gone' is not a field of the schema, cleared",
        "card: preview field 'body' is a RICH_TEXT field, which can not be a preview, cleared",
      ]);
    } finally {
      await odd.close();
    }
  });

  it('keeps known locales in their order and skips the others (and broken environments), with a warning', async () => {
    const odd = await fakeFirebase([
      {
        id: 'fbOdd',
        name: 'Odd',
        doc: {
          locales: [
            { id: 'xx-old', name: 'Old' },
            { id: 'fr', name: 'Français' },
            { id: 'de', name: 'German' },
          ],
          localeFallback: { id: 'xx-old', name: 'Old' },
          environments: [{ name: 'Ok', url: 'https://ok.example.com' }, { name: 'Broken' }],
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      },
    ]);
    try {
      const id = newUuid();
      await t.db.insert(firebaseImports).values({
        id,
        origin: odd.url,
        sourceSpaceId: 'fbOdd',
        sourceSpaceName: 'Odd',
        status: 'RUNNING',
        stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
        startedBy: { name: 'Admin', email: 'admin@example.com' },
      });
      await t.app.get(FirebaseImportRunner).execute(id, new FirebaseClient(odd.url, 'migration-secret', { allowInternal: true }), 'fbOdd');
      const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
      expect(run.status).toBe('FINISHED');
      const stage = run.stages.find(it => it.stage === 'locales')!;
      expect(stage.count).toBe(2);
      expect(stage.warnings?.join('\n')).toMatch(/xx-old: not a known locale, skipped/);
      expect(stage.warnings?.join('\n')).toMatch(/default locale xx-old skipped; fr is the default/);
      const [space] = await readSpaces(t.db, run.spaceId!);
      // Names come from the locales table, not from the Firebase space.
      expect(space.locales).toEqual([
        { id: 'fr', name: 'French' },
        { id: 'de', name: 'German' },
      ]);
      expect(space.defaultLocale).toEqual({ id: 'fr', name: 'French' });
      expect(space.environments.map(it => it.name)).toEqual(['Ok']);
      expect(run.stages.find(it => it.stage === 'environments')!.warnings).toEqual(['1 without a name or URL, skipped']);
    } finally {
      await odd.close();
    }
  });

  it('records the failing stage and keeps the space flagged', async () => {
    const failing = await fakeFirebase([{ ...site, id: 'fbFail' }], { failAfterFiles: 0 });
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: failing.url,
      sourceSpaceId: 'fbFail',
      sourceSpaceName: 'Site',
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app
      .get(FirebaseImportRunner)
      .execute(id, new FirebaseClient(failing.url, 'migration-secret', { allowInternal: true }), 'fbFail');
    await failing.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run.status).toBe('FAILED');
    expect(toFirebaseImport(run).error).toMatchObject({ stage: 'assets', message: expect.stringContaining('asset') });
    expect(run.stages.find(it => it.stage === 'translations')!.status).toBe('DONE');
    expect(run.stages.find(it => it.stage === 'assets')!.status).toBe('FAILED');
    expect(run.stages.find(it => it.stage === 'contents')!.status).toBe('PENDING');
    const [space] = await readSpaces(t.db, run.spaceId!);
    expect(space).toMatchObject({ legacyId: 'fbFail', importStatus: 'FAILED' });
  });

  it('keeps an asset whose file Firebase answers 500 for without it, with a warning, and goes on', async () => {
    const failing = await fakeFirebase([{ ...site, id: 'fbBig', files: { a1: photo } }], { failingFiles: ['a1'] });
    const id = newUuid();
    await t.db.insert(firebaseImports).values({
      id,
      origin: failing.url,
      sourceSpaceId: 'fbBig',
      sourceSpaceName: 'Site',
      status: 'RUNNING',
      stages: FIREBASE_IMPORT_STAGES.map(stage => ({ stage, status: 'PENDING' as const, count: 0 })),
      startedBy: { name: 'Admin', email: 'admin@example.com' },
    });
    await t.app
      .get(FirebaseImportRunner)
      .execute(id, new FirebaseClient(failing.url, 'migration-secret', { allowInternal: true, retryDelayMs: 0 }), 'fbBig');
    await failing.close();
    const [run] = await t.db.select().from(firebaseImports).where(eq(firebaseImports.id, id));
    expect(run.status).toBe('FINISHED');
    expect(run.stages.find(it => it.stage === 'assets')!.warnings?.join('\n')).toMatch(
      /photo: Firebase could not serve its file \(Asset a1 answered 500 3 times\), the asset is kept without it/,
    );
    const file = (await t.db.select().from(assets).where(eq(assets.spaceId, run.spaceId!))).find(it => it.legacyId === 'a1');
    expect(file).toMatchObject({ originalName: 'photo.jpg', md5: null, size: photo.length });
  });
});
