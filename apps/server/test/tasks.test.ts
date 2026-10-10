import { randomBytes } from 'node:crypto';
import archiver from 'archiver';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import unzipper from 'unzipper';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, contents, schemas, spaces, tasks, tokens, translations } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { STALE_AFTER_MS, TaskWorker } from '../src/modules/tasks/task-worker.service.js';
import { createTestApp, TestApp, userWithAccess, XHR } from './test-app.js';
import { SPACE_A, SPACE_B, SPACE_S, UUID_V7 } from './ids.js';
import { newUuid } from '../src/infra/database/id.js';

const en = { id: 'en', name: 'English' };
const de = { id: 'de', name: 'German' };

function multipart(fields: Record<string, string>, file: { filename: string; bytes: Buffer }) {
  const boundary = `----localess${randomBytes(8).toString('hex')}`;
  const parts: Buffer[] = Object.entries(fields).map(([name, value]) =>
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`),
  );
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    file.bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { payload: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

/** Builds a zip in memory, the way the Firebase-era export wrote them. */
async function zipOf(entries: Record<string, string | Buffer>): Promise<Buffer> {
  const archive = archiver('zip');
  const chunks: Buffer[] = [];
  archive.on('data', chunk => chunks.push(chunk));
  for (const [name, content] of Object.entries(entries)) archive.append(content, { name });
  await archive.finalize();
  return Buffer.concat(chunks);
}

async function readZip(bytes: Buffer): Promise<Record<string, Buffer>> {
  const directory = await unzipper.Open.buffer(bytes);
  return Object.fromEntries(await Promise.all(directory.files.map(async file => [file.path, await file.buffer()] as const)));
}

const PHOTOS = '00000000-0000-7000-8000-0000000000f1';
const PIC = '00000000-0000-7000-8000-0000000000f2';

describe('task worker: exports and imports', () => {
  let t: TestApp;
  let cookie: string;
  let jpeg: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'admin' });
    jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#336699' } })
      .jpeg()
      .toBuffer();
    for (const id of [SPACE_A, SPACE_B]) await t.db.insert(spaces).values({ id, name: id, locales: [en, de], localeFallback: en });
    await t.db.insert(schemas).values([
      { id: newUuid(), spaceId: SPACE_A, name: 'page', type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: 'TEXT', translatable: true }] },
      { id: newUuid(), spaceId: SPACE_A, name: 'colors', type: 'ENUM', values: [{ name: 'Red', value: 'red' }] },
    ]);
    await t.db.insert(contents).values([
      { spaceId: SPACE_A, id: 'blog', kind: 'FOLDER', name: 'Blog', slug: 'blog', parentSlug: '', fullSlug: 'blog' },
      { spaceId: SPACE_A, id: 'y2026', kind: 'FOLDER', name: '2026', slug: '2026', parentSlug: 'blog', fullSlug: 'blog/2026' },
      {
        spaceId: SPACE_A,
        id: 'post',
        kind: 'DOCUMENT',
        name: 'Post',
        slug: 'post',
        parentSlug: 'blog/2026',
        fullSlug: 'blog/2026/post',
        schema: 'page',
        data: { _id: 'r', _schema: 'page', title: 'Hi', title_i18n_de: 'Hallo' },
      },
      { spaceId: SPACE_A, id: 'about', kind: 'DOCUMENT', name: 'About', slug: 'about', parentSlug: '', fullSlug: 'about', schema: 'page' },
    ]);
    await t.db.insert(translations).values([
      { id: newUuid(), spaceId: SPACE_A, key: 'greeting', type: 'STRING', locales: { en: 'Hello', de: 'Hallo' }, labels: ['ui'] },
      { id: newUuid(), spaceId: SPACE_A, key: 'farewell', type: 'STRING', locales: { en: 'Bye' } },
    ]);
    await t.db.insert(assets).values([
      { spaceId: SPACE_A, id: PHOTOS, kind: 'FOLDER', name: 'Photos', parentPath: '' },
      {
        spaceId: SPACE_A,
        id: PIC,
        kind: 'FILE',
        name: 'pic',
        parentPath: PHOTOS,
        extension: '.jpg',
        type: 'image/jpeg',
        size: jpeg.length,
        metadata: { type: 'image', width: 64, height: 48 },
      },
    ]);
    await t.app.get<StorageDriver>(STORAGE_DRIVER).put(`spaces/${SPACE_A}/assets/${PIC}/original`, jpeg);
  });

  afterAll(() => t?.close());

  const headers = () => ({ ...XHR, cookie });

  /** Waits until the worker has finished the task (events reach it asynchronously). */
  async function settled(spaceId: string, id: string) {
    for (let i = 0; i < 200; i++) {
      await t.app.get(TaskWorker).whenIdle();
      const [task] = await t.db.select().from(tasks).where(eq(tasks.id, id));
      if (task.status === 'FINISHED' || task.status === 'ERROR') return task;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`task ${id} in ${spaceId} never finished`);
  }

  async function exportTask(spaceId: string, body: object) {
    const response = await t.request({ method: 'POST', url: `/api/app/spaces/${spaceId}/tasks`, headers: headers(), payload: body });
    expect(response.statusCode, response.body).toBe(201);
    return settled(spaceId, response.json().id);
  }

  async function download(spaceId: string, id: string): Promise<Buffer> {
    const response = await t.request({ method: 'GET', url: `/api/app/spaces/${spaceId}/tasks/${id}/download`, headers: headers() });
    expect(response.statusCode).toBe(200);
    return response.rawPayload;
  }

  async function importTask(spaceId: string, kind: string, bytes: Buffer, fields: Record<string, string> = {}) {
    const body = multipart({ kind, ...fields }, { filename: 'import.zip', bytes });
    const response = await t.request({
      method: 'POST',
      url: `/api/app/spaces/${spaceId}/tasks/import`,
      headers: { ...headers(), 'content-type': body.contentType },
      payload: body.payload,
    });
    expect(response.statusCode, response.body).toBe(201);
    return settled(spaceId, response.json().id);
  }

  async function logs(spaceId: string, id: string): Promise<string[]> {
    const response = await t.request({ method: 'GET', url: `/api/app/spaces/${spaceId}/tasks/${id}/logs`, headers: headers() });
    return response.json().map((it: { message: string }) => it.message);
  }

  describe('schemas', () => {
    it('exports a zip with schemas.json and metadata, and imports it into another space', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'SCHEMA_EXPORT' });
      expect(exported).toMatchObject({ status: 'FINISHED', file: { name: `schema-export-${exported.id}.lls.zip` } });
      const bytes = await download(SPACE_A, exported.id);
      expect(exported.file?.size).toBe(bytes.length);
      const files = await readZip(bytes);
      expect(JSON.parse(files['metadata.json'].toString())).toEqual({ kind: 'SCHEMA' });
      expect(JSON.parse(files['schemas.json'].toString()).map((s: { id: string }) => s.id)).toEqual(['colors', 'page']);

      const imported = await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes);
      expect(imported.status).toBe('FINISHED');
      expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, SPACE_B))).map(s => s.name).sort()).toEqual(['colors', 'page']);
      expect(await logs(SPACE_B, imported.id)).toEqual(
        expect.arrayContaining(['Starting SCHEMA_IMPORT processing', 'total changes : 2', 'Task finished successfully']),
      );
    });
  });

  describe('contents', () => {
    it('round-trips the whole tree into another space, keeping ids', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'CONTENT_EXPORT' });
      expect(exported.file?.name).toBe(`content-export-${exported.id}.llc.zip`);
      const bytes = await download(SPACE_A, exported.id);
      expect((await importTask(SPACE_B, 'CONTENT_IMPORT', bytes)).status).toBe('FINISHED');
      const b = await t.db.select().from(contents).where(eq(contents.spaceId, SPACE_B));
      expect(b.map(c => c.id).sort()).toEqual(['about', 'blog', 'post', 'y2026']);
      expect(b.find(c => c.id === 'post')).toMatchObject({ fullSlug: 'blog/2026/post', data: { title: 'Hi', title_i18n_de: 'Hallo' } });

      // The same file again changes nothing.
      const again = await importTask(SPACE_B, 'CONTENT_IMPORT', bytes);
      expect(await logs(SPACE_B, again.id)).toContain('total changes : 0');
    });

    it('exports one document with the folders leading to it', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'CONTENT_EXPORT', path: 'post' });
      const files = await readZip(await download(SPACE_A, exported.id));
      expect(JSON.parse(files['metadata.json'].toString())).toEqual({ kind: 'CONTENT', path: 'post' });
      expect(JSON.parse(files['contents.json'].toString()).map((c: { id: string }) => c.id)).toEqual(['post', 'blog', 'y2026']);
    });

    it('exports a folder with its subtree', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'CONTENT_EXPORT', path: 'blog' });
      const files = await readZip(await download(SPACE_A, exported.id));
      expect(
        JSON.parse(files['contents.json'].toString())
          .map((c: { id: string }) => c.id)
          .sort(),
      ).toEqual(['blog', 'post', 'y2026']);
    });

    it('imports a Firebase-era export whose document data is a JSON string', async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'CONTENT' }),
        'contents.json': JSON.stringify([
          {
            id: 'legacy',
            kind: 'DOCUMENT',
            name: 'Legacy',
            slug: 'legacy',
            parentSlug: '',
            fullSlug: 'legacy',
            schema: 'page',
            data: JSON.stringify({ _id: 'x', _schema: 'page', title: 'Old' }),
          },
        ]),
      });
      expect((await importTask(SPACE_B, 'CONTENT_IMPORT', bytes)).status).toBe('FINISHED');
      const [row] = await t.db
        .select()
        .from(contents)
        .where(and(eq(contents.spaceId, SPACE_B), eq(contents.id, 'legacy')));
      expect(row.data).toEqual({ _id: 'x', _schema: 'page', title: 'Old' });
    });

    it('is served by the public API of the importing space', async () => {
      await t.db.insert(tokens).values({ id: newUuid(), token: 'BBBBBBBBBBBBBBBBBBBB', spaceId: SPACE_B, name: 't', version: 2, permissions: ['CONTENT_DRAFT'] });
      const redirect = await t.request({
        method: 'GET',
        url: `/api/v1/spaces/${SPACE_B}/contents/post?token=BBBBBBBBBBBBBBBBBBBB&version=draft&locale=de`,
      });
      const response = await t.request({ method: 'GET', url: redirect.headers.location as string });
      expect(response.json()).toMatchObject({ id: 'post', locale: 'de', data: { title: 'Hallo' } });
    });
  });

  describe('assets', () => {
    it('round-trips folders and files with their bytes into another space', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'ASSET_EXPORT' });
      expect(exported.file?.name).toBe(`asset-export-${exported.id}.lla.zip`);
      const bytes = await download(SPACE_A, exported.id);
      const files = await readZip(bytes);
      expect(Object.keys(files).sort()).toEqual(['assets.json', `assets/${PIC}`, 'metadata.json']);
      expect(files[`assets/${PIC}`].equals(jpeg)).toBe(true);

      expect((await importTask(SPACE_B, 'ASSET_IMPORT', bytes)).status).toBe('FINISHED');
      const b = await t.db.select().from(assets).where(eq(assets.spaceId, SPACE_B));
      // Same ids in the other space: the key is (space_id, id).
      expect(b.find(a => a.id === PIC)).toMatchObject({
        parentPath: PHOTOS,
        size: jpeg.length,
        md5: expect.any(String),
        metadata: { width: 64, height: 48 },
      });
      const served = await t.request({ method: 'GET', url: `/api/v1/spaces/${SPACE_B}/assets/${PIC}/original` });
      expect(served.rawPayload.equals(jpeg)).toBe(true);
    });

    it('gives Firestore ids of a Firebase-era export UUIDs, kept as legacy_id; folders paths follow; a re-import reuses them', async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'ASSET' }),
        'assets.json': JSON.stringify([
          { id: 'oldFolder', kind: 'FOLDER', name: 'Old', parentPath: '' },
          { id: 'oldFile', kind: 'FILE', name: 'old', parentPath: 'oldFolder', extension: '.jpg', type: 'image/jpeg', size: jpeg.length },
        ]),
        'assets/oldFile': jpeg,
      });
      expect((await importTask(SPACE_B, 'ASSET_IMPORT', bytes)).status).toBe('FINISHED');
      const imported = async () => {
        const rows = await t.db.select().from(assets).where(eq(assets.spaceId, SPACE_B));
        return { folder: rows.find(a => a.legacyId === 'oldFolder')!, file: rows.find(a => a.legacyId === 'oldFile')! };
      };
      const { folder, file } = await imported();
      expect(folder.id).toMatch(UUID_V7);
      expect(file).toMatchObject({ id: expect.stringMatching(UUID_V7), parentPath: folder.id });
      const served = await t.request({ method: 'GET', url: `/api/v1/spaces/${SPACE_B}/assets/${file.id}/original` });
      expect(served.rawPayload.equals(jpeg)).toBe(true);

      expect((await importTask(SPACE_B, 'ASSET_IMPORT', bytes)).status).toBe('FINISHED');
      expect(await imported()).toMatchObject({ folder: { id: folder.id }, file: { id: file.id } });
    });

    it('extracts metadata for imported files that carry none, and skips files missing from the archive', async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'ASSET' }),
        'assets.json': JSON.stringify([
          { id: 'fresh', kind: 'FILE', name: 'fresh', parentPath: '', extension: '.jpg', type: 'image/jpeg', size: jpeg.length },
          { id: 'ghost', kind: 'FILE', name: 'ghost', parentPath: '', extension: '.jpg', type: 'image/jpeg', size: 1 },
        ]),
        'assets/fresh': jpeg,
      });
      expect((await importTask(SPACE_B, 'ASSET_IMPORT', bytes)).status).toBe('FINISHED');
      const legacyIds = (await t.db.select().from(assets).where(eq(assets.spaceId, SPACE_B))).map(a => a.legacyId);
      expect(legacyIds).toContain('fresh');
      expect(legacyIds).not.toContain('ghost');
      const [fresh] = await t.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, SPACE_B), eq(assets.legacyId, 'fresh')));
      expect(fresh.metadata).toMatchObject({ type: 'image', width: 64, height: 48 });
    });

    it('refuses asset ids that are not safe storage keys', async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'ASSET' }),
        'assets.json': JSON.stringify([{ id: '../escape', kind: 'FOLDER', name: 'x', parentPath: '' }]),
      });
      expect(await importTask(SPACE_B, 'ASSET_IMPORT', bytes)).toMatchObject({ status: 'ERROR', message: 'Asset data is invalid.' });
    });

    it('regenerates metadata of every file', async () => {
      await t.db
        .update(assets)
        .set({ metadata: null })
        .where(and(eq(assets.spaceId, SPACE_A), eq(assets.id, PIC)));
      expect((await exportTask(SPACE_A, { kind: 'ASSET_REGEN_METADATA' })).status).toBe('FINISHED');
      const [pic] = await t.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, SPACE_A), eq(assets.id, PIC)));
      expect(pic.metadata).toMatchObject({ type: 'image', format: 'jpg', width: 64, height: 48 });
    });
  });

  describe('translations', () => {
    it('round-trips all translations as a zip', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'TRANSLATION_EXPORT' });
      expect(exported.file?.name).toBe(`translation-export-${exported.id}.llt.zip`);
      const files = await readZip(await download(SPACE_A, exported.id));
      expect(JSON.parse(files['translations.json'].toString())).toEqual([
        { id: 'farewell', type: 'STRING', locales: { en: 'Bye' } },
        { id: 'greeting', type: 'STRING', locales: { en: 'Hello', de: 'Hallo' }, labels: ['ui'] },
      ]);
      const before = (await t.db.select().from(spaces).where(eq(spaces.id, SPACE_B)))[0].translationVersion;
      expect((await importTask(SPACE_B, 'TRANSLATION_IMPORT', await download(SPACE_A, exported.id))).status).toBe('FINISHED');
      expect((await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key).sort()).toEqual([
        'farewell',
        'greeting',
      ]);
      expect((await t.db.select().from(spaces).where(eq(spaces.id, SPACE_B)))[0].translationVersion).toBe(before + 1);
    });

    it('exports one locale as flat JSON and imports it into a locale, creating missing keys', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'TRANSLATION_EXPORT', locale: 'de' });
      expect(exported.file?.name).toBe(`translation-de-export-${exported.id}.json`);
      const flat = await download(SPACE_A, exported.id);
      expect(JSON.parse(flat.toString())).toEqual({ greeting: 'Hallo' });

      const edited = Buffer.from(JSON.stringify({ greeting: 'Servus', brandNew: 'Neu' }));
      expect((await importTask(SPACE_B, 'TRANSLATION_IMPORT', edited, { locale: 'de' })).status).toBe('FINISHED');
      const b = await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B));
      expect(b.find(it => it.key === 'greeting')?.locales).toEqual({ en: 'Hello', de: 'Servus' });
      expect(b.find(it => it.key === 'brandNew')).toMatchObject({ type: 'STRING', locales: { de: 'Neu' } });
    });
  });

  describe('bad files', () => {
    it('reports the wrong kind of export', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'SCHEMA_EXPORT' });
      expect(await importTask(SPACE_B, 'CONTENT_IMPORT', await download(SPACE_A, exported.id))).toMatchObject({
        status: 'ERROR',
        message: 'It is not a Content Export file.',
      });
    });

    it('reports files that are not archives', async () => {
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', Buffer.from('not a zip'))).toMatchObject({
        status: 'ERROR',
        message: 'It is not a Translation Export file.',
      });
    });

    it('reports invalid data with the validation issues as trace, without writing anything', async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'CONTENT' }),
        'contents.json': JSON.stringify([{ id: 'x', kind: 'DOCUMENT' }]),
      });
      const task = await importTask(SPACE_B, 'CONTENT_IMPORT', bytes);
      expect(task).toMatchObject({ status: 'ERROR', message: 'Content data is invalid.' });
      expect(JSON.parse(task.trace as string).length).toBeGreaterThan(0);
      expect(
        await t.db
          .select()
          .from(contents)
          .where(and(eq(contents.spaceId, SPACE_B), eq(contents.id, 'x'))),
      ).toEqual([]);
    });
  });
});

describe('task worker: queue', () => {
  let t: TestApp;

  beforeAll(async () => {
    // The worker is driven by hand here.
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    await t.db.insert(spaces).values({ id: SPACE_S, name: 'S', locales: [en], localeFallback: en });
  });

  afterAll(() => t?.close());

  it('hands each task to exactly one claimant, oldest first', async () => {
    await t.db.insert(tasks).values([
      { id: 'older', spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'INITIATED', createdAt: new Date('2026-01-01') },
      { id: 'newer', spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'INITIATED', createdAt: new Date('2026-01-02') },
    ]);
    const worker = t.app.get(TaskWorker);
    const claims = await Promise.all([worker.claim(), worker.claim(), worker.claim()]);
    const claimed = claims.filter(Boolean).map(it => it!.id);
    expect(claimed.sort()).toEqual(['newer', 'older']);
    const rows = await t.db.select().from(tasks).where(eq(tasks.spaceId, SPACE_S));
    expect(rows.every(row => row.status === 'IN_PROGRESS' && row.lockedBy === worker.workerId)).toBe(true);
  });

  it('marks tasks interrupted mid-run as failed instead of running them again', async () => {
    await t.db.insert(tasks).values([
      {
        id: 'stuck',
        spaceId: SPACE_S,
        kind: 'CONTENT_IMPORT',
        status: 'IN_PROGRESS',
        lockedBy: 'gone',
        lockedAt: new Date(Date.now() - STALE_AFTER_MS - 1000),
      },
      { id: 'running', spaceId: SPACE_S, kind: 'CONTENT_IMPORT', status: 'IN_PROGRESS', lockedBy: 'alive', lockedAt: new Date() },
    ]);
    await t.app.get(TaskWorker).failStale();
    const [stuck] = await t.db.select().from(tasks).where(eq(tasks.id, 'stuck'));
    const [running] = await t.db.select().from(tasks).where(eq(tasks.id, 'running'));
    expect(stuck).toMatchObject({ status: 'ERROR', message: expect.stringContaining('interrupted'), lockedBy: null });
    expect(running.status).toBe('IN_PROGRESS');
  });
});
