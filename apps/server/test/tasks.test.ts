import { SchemaFieldKind } from '@localess/shared';
import { randomBytes } from 'node:crypto';
import archiver from 'archiver';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import unzipper from 'unzipper';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, contents, schemas, tasks, translations } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { STALE_AFTER_MS, TaskWorker } from '../src/modules/tasks/workers/task-worker.service.js';
import { buildDrafts, createTestApp, draftSnapshots, insertSpace, TestApp, userWithAccess, XHR } from './test-app.js';
import { SPACE_A, SPACE_B, SPACE_S } from './ids.js';
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

// The content tree of space A, by the names the assertions use.
const TC = {
  blog: '00000000-0000-7000-8000-0000000000b1',
  y2026: '00000000-0000-7000-8000-0000000000b2',
  post: '00000000-0000-7000-8000-0000000000b3',
  about: '00000000-0000-7000-8000-0000000000b4',
} as const;
const PHOTOS = '00000000-0000-7000-8000-0000000000f1';
const PIC = '00000000-0000-7000-8000-0000000000f2';

describe('task worker: exports and imports', () => {
  let t: TestApp;
  let cookie: string;
  let jpeg: Buffer;

  beforeAll(async () => {
    t = await createTestApp();
    cookie = await userWithAccess(t, 'admin@example.com', { role: 'ADMIN' });
    jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#336699' } })
      .jpeg()
      .toBuffer();
    for (const id of [SPACE_A, SPACE_B]) await insertSpace(t.db, { id, name: id, locales: [en, de], defaultLocale: en });
    await t.db.insert(schemas).values([
      { id: newUuid(), spaceId: SPACE_A, name: 'page', type: 'ROOT', displayName: 'Page', fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }] },
      { id: newUuid(), spaceId: SPACE_A, name: 'colors', type: 'ENUM', values: [{ name: 'Red', value: 'red' }] },
    ]);
    await t.db.insert(contents).values([
      { spaceId: SPACE_A, id: TC.blog, kind: 'FOLDER', name: 'Blog', slug: 'blog' },
      { spaceId: SPACE_A, id: TC.y2026, kind: 'FOLDER', name: '2026', slug: '2026', parentId: TC.blog },
      {
        spaceId: SPACE_A,
        id: TC.post,
        kind: 'DOCUMENT',
        name: 'Post',
        slug: 'post',
        parentId: TC.y2026,
        schema: 'page',
        data: { _id: 'r', _schema: 'page', title: 'Hi', title_i18n_de: 'Hallo' },
      },
      { spaceId: SPACE_A, id: TC.about, kind: 'DOCUMENT', name: 'About', slug: 'about', schema: 'page' },
    ]);
    await t.db.insert(translations).values([
      { id: newUuid(), spaceId: SPACE_A, key: 'greeting', locales: { en: 'Hello', de: 'Hallo' }, labels: ['ui'] },
      { id: newUuid(), spaceId: SPACE_A, key: 'farewell', locales: { en: 'Bye' } },
    ]);
    await t.db.insert(assets).values([
      { spaceId: SPACE_A, id: PHOTOS, kind: 'FOLDER', name: 'Photos' },
      {
        spaceId: SPACE_A,
        id: PIC,
        kind: 'FILE',
        name: 'pic',
        parentId: PHOTOS,
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

    it('refuses an import whose fields break a rule across fields, writing nothing', async () => {
      const bytes = await zipOf({
        'schemas.json': JSON.stringify([{ id: 'broken', type: 'ROOT', fields: [{ name: 'hero', kind: 'SCHEMA', schemas: ['gone'] }] }]),
        'metadata.json': JSON.stringify({ kind: 'SCHEMA' }),
      });
      const imported = await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes);
      expect(imported).toMatchObject({ status: 'ERROR', message: 'Schema data is invalid.' });
      expect(await logs(SPACE_B, imported.id)).toContain("Schema 'broken': field 'hero' allows 'gone', which does not exist");
      expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, SPACE_B))).map(s => s.name)).not.toContain('broken');
    });
  });

  describe('contents', () => {
    it('content export and import are switched off until their redesign', async () => {
      expect(await exportTask(SPACE_A, { kind: 'CONTENT_EXPORT' })).toMatchObject({
        status: 'ERROR',
        message: 'Content import and export are being redesigned',
      });
      const bytes = await zipOf({ 'metadata.json': JSON.stringify({ kind: 'CONTENT' }), 'contents.json': '[]' });
      expect(await importTask(SPACE_B, 'CONTENT_IMPORT', bytes)).toMatchObject({
        status: 'ERROR',
        message: 'Content import and export are being redesigned',
      });
    });
  });

  describe('assets', () => {
    it('asset export and import are switched off until their redesign', async () => {
      expect(await exportTask(SPACE_A, { kind: 'ASSET_EXPORT' })).toMatchObject({
        status: 'ERROR',
        message: 'Asset import and export are being redesigned',
      });
      const bytes = await zipOf({ 'metadata.json': JSON.stringify({ kind: 'ASSET' }), 'assets.json': '[]' });
      expect(await importTask(SPACE_B, 'ASSET_IMPORT', bytes)).toMatchObject({
        status: 'ERROR',
        message: 'Asset import and export are being redesigned',
      });
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
        { id: 'farewell', locales: { en: 'Bye' } },
        { id: 'greeting', locales: { en: 'Hello', de: 'Hallo' }, labels: ['ui'] },
      ]);
      await buildDrafts(t, SPACE_B);
      expect((await importTask(SPACE_B, 'TRANSLATION_IMPORT', await download(SPACE_A, exported.id))).status).toBe('FINISHED');
      expect((await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key).sort()).toEqual([
        'farewell',
        'greeting',
      ]);
      expect(await draftSnapshots(t.db, SPACE_B)).toEqual([]);
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
      expect(b.find(it => it.key === 'brandNew')).toMatchObject({ locales: { de: 'Neu' } });
    });

    it("imports values only for the space's locales, logging the skipped ones", async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'TRANSLATION' }),
        'translations.json': JSON.stringify([{ id: 'only.fr', type: 'STRING', locales: { en: 'Only', fr: 'Seul', it: 'Solo' } }]),
      });
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', bytes);
      expect(task.status).toBe('FINISHED');
      const [row] = await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, SPACE_B), eq(translations.key, 'only.fr')));
      expect(row.locales).toEqual({ en: 'Only' });
      expect((await logs(SPACE_B, task.id)).join('\n')).toMatch(/skipped 2 values of locales not in the space: fr, it/);
    });

    it('refuses to create keys outside the key rule, naming them and writing nothing', async () => {
      const zip = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'TRANSLATION' }),
        'translations.json': JSON.stringify([
          { id: 'fine.key', locales: { en: 'Fine' } },
          { id: 'bad key', locales: { en: 'Bad' } },
        ]),
      });
      const flat = Buffer.from(JSON.stringify({ 'fine.flat': 'Fine', 'trailing.': 'Bad' }));
      for (const task of [await importTask(SPACE_B, 'TRANSLATION_IMPORT', zip), await importTask(SPACE_B, 'TRANSLATION_IMPORT', flat, { locale: 'de' })]) {
        expect(task.status).toBe('ERROR');
        expect(task.message).toMatch(/Invalid translation keys: (bad key|trailing\.)/);
      }
      const keys = (await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key);
      expect(keys).not.toContain('fine.key');
      expect(keys).not.toContain('fine.flat');
    });

    it("refuses a single-locale import into a locale the space does not have", async () => {
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', Buffer.from(JSON.stringify({ greeting: 'Salut' })), { locale: 'fr' });
      expect(task).toMatchObject({ status: 'ERROR', message: 'Locale fr is not in the space locales.' });
    });
  });

  describe('bad files', () => {
    it('reports the wrong kind of export', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'SCHEMA_EXPORT' });
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', await download(SPACE_A, exported.id))).toMatchObject({
        status: 'ERROR',
        message: 'It is not a Translation Export file.',
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
        'metadata.json': JSON.stringify({ kind: 'SCHEMA' }),
        'schemas.json': JSON.stringify([{ id: 'x', type: 'NOPE' }]),
      });
      const count = async () => (await t.db.select().from(schemas).where(eq(schemas.spaceId, SPACE_B))).length;
      const before = await count();
      const task = await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes);
      expect(task).toMatchObject({ status: 'ERROR', message: 'Schema data is invalid.' });
      expect(JSON.parse(task.trace as string).length).toBeGreaterThan(0);
      expect(await count()).toBe(before);
    });
  });
});

// Queue tasks, by the names the assertions use.
const Q = {
  older: '00000000-0000-7000-8000-0000000000d1',
  newer: '00000000-0000-7000-8000-0000000000d2',
  stuck: '00000000-0000-7000-8000-0000000000d3',
  running: '00000000-0000-7000-8000-0000000000d4',
} as const;

describe('task worker: queue', () => {
  let t: TestApp;

  beforeAll(async () => {
    // The worker is driven by hand here.
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    await insertSpace(t.db, { id: SPACE_S, name: 'S', locales: [en], defaultLocale: en });
  });

  afterAll(() => t?.close());

  it('hands each task to exactly one claimant, oldest first', async () => {
    await t.db.insert(tasks).values([
      { id: Q.older, spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'INITIATED', createdAt: new Date('2026-01-01') },
      { id: Q.newer, spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'INITIATED', createdAt: new Date('2026-01-02') },
    ]);
    const worker = t.app.get(TaskWorker);
    const claims = await Promise.all([worker.claim(), worker.claim(), worker.claim()]);
    const claimed = claims.filter(Boolean).map(it => it!.id);
    expect(claimed.sort()).toEqual([Q.older, Q.newer]);
    const rows = await t.db.select().from(tasks).where(eq(tasks.spaceId, SPACE_S));
    expect(rows.every(row => row.status === 'IN_PROGRESS' && row.lockedBy === worker.workerId)).toBe(true);
  });

  it('marks tasks interrupted mid-run as failed instead of running them again', async () => {
    await t.db.insert(tasks).values([
      {
        id: Q.stuck,
        spaceId: SPACE_S,
        kind: 'CONTENT_IMPORT',
        status: 'IN_PROGRESS',
        lockedBy: 'gone',
        lockedAt: new Date(Date.now() - STALE_AFTER_MS - 1000),
      },
      { id: Q.running, spaceId: SPACE_S, kind: 'CONTENT_IMPORT', status: 'IN_PROGRESS', lockedBy: 'alive', lockedAt: new Date() },
    ]);
    await t.app.get(TaskWorker).failStale();
    const [stuck] = await t.db.select().from(tasks).where(eq(tasks.id, Q.stuck));
    const [running] = await t.db.select().from(tasks).where(eq(tasks.id, Q.running));
    expect(stuck).toMatchObject({ status: 'ERROR', message: expect.stringContaining('interrupted'), lockedBy: null });
    expect(running.status).toBe('IN_PROGRESS');
  });
});
