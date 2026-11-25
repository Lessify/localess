import { randomBytes } from 'node:crypto';

import { SchemaFieldKind } from '@localess/shared';
import archiver from 'archiver';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import unzipper from 'unzipper';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { assets, contents, schemas, taskLogs, tasks, translations } from '../src/infra/database/schema.js';
import { EventService } from '../src/infra/events/event.service.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/infra/storage/storage.driver.js';
import { TaskRepository } from '../src/modules/tasks/repositories/task.repository.js';
import { TranslationTransferRepository } from '../src/modules/tasks/repositories/translation-transfer.repository.js';
import { STALE_AFTER_MS, TaskWorker } from '../src/modules/tasks/workers/task-worker.service.js';
import { SPACE_A, SPACE_B, SPACE_S } from './ids.js';
import { buildDrafts, createTestApp, draftSnapshots, insertSpace, TestApp, userWithAccess, XHR } from './test-app.js';

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

/** A .localess.zip of these lines. */
async function localessZip(kind: 'TRANSLATION' | 'SCHEMA', lines: object[]): Promise<Buffer> {
  const manifest = {
    format: 'localess',
    version: 1,
    kind,
    exportedAt: '2026-10-23T00:00:00.000Z',
    source: { spaceId: 'x', spaceName: 'X', locales: ['en', 'de'] },
    count: lines.length,
  };
  const entry = kind === 'TRANSLATION' ? 'translations.jsonl' : 'schemas.jsonl';
  return zipOf({ 'manifest.json': JSON.stringify(manifest), [entry]: lines.map(line => JSON.stringify(line)).join('\n') + '\n' });
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
      {
        id: newUuid(),
        spaceId: SPACE_A,
        name: 'page',
        type: 'ROOT',
        displayName: 'Page',
        fields: [{ name: 'title', kind: SchemaFieldKind.TEXT, translatable: true }],
      },
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
        originalName: 'pic.jpg',
        parentId: PHOTOS,
        extension: '.jpg',
        type: 'image/jpeg',
        size: jpeg.length,
        metadata: { type: 'image', width: 64, height: 48 },
      },
    ]);
    await t.app.get<StorageDriver>(STORAGE_DRIVER).put(`spaces/${SPACE_A}/assets/${PIC}/pic.jpg`, jpeg);
  });

  afterAll(() => t?.close());

  const headers = () => ({ ...XHR, cookie });

  /** Waits until the worker has finished the task (events reach it asynchronously), then reads what it logged. */
  async function settled(spaceId: string, id: string) {
    for (let i = 0; i < 200; i++) {
      await t.app.get(TaskWorker).whenIdle();
      const [task] = await t.db.select().from(tasks).where(eq(tasks.id, id));
      if (task.status === 'FINISHED' || task.status === 'ERROR') return { ...task, ...(await outcomeOf(spaceId, id)) };
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`task ${id} in ${spaceId} never finished`);
  }

  /** A task's outcome as its logs tell it: the error (last ERROR line), the problems (WARN lines) and the counts (INFO). */
  async function outcomeOf(spaceId: string, id: string) {
    const response = await t.request({ method: 'GET', url: `/api/app/spaces/${spaceId}/tasks/${id}/logs`, headers: headers() });
    const lines = response.json<{ level: string; message: string }[]>();
    const message = lines.filter(it => it.level === 'ERROR').at(-1)?.message;
    const problems = lines
      .filter(it => it.level === 'WARN' && /^[^ ]+: /.test(it.message))
      .map(it => ({ path: it.message.slice(0, it.message.indexOf(': ')), message: it.message.slice(it.message.indexOf(': ') + 2) }));
    const line = lines.find(it => /^[\d,]+ created · /.test(it.message))?.message;
    const numbers = line?.match(/[\d,]+/g)?.map(it => Number(it.replace(/,/g, '')));
    const counts = numbers && { created: numbers[0], updated: numbers[1], unchanged: numbers[2], skipped: numbers[3] };
    return { message, problems, counts, lines };
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
    const filename = fields.locale ? 'import.json' : 'import.localess.zip';
    const format: Record<string, string> =
      kind === 'TRANSLATION_IMPORT' ? { type: fields.locale ? 'translation-json-flat' : 'translation-full' } : {};
    const body = multipart({ kind, ...format, ...fields }, { filename, bytes });
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
    it('exports a .localess.zip of schemas by name, without ids, and imports it into another space', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'SCHEMA_EXPORT' });
      expect(exported).toMatchObject({ status: 'FINISHED' });
      expect(exported.file?.name).toMatch(/-schemas-\d{4}-\d{2}-\d{2}\.localess\.zip$/);
      const bytes = await download(SPACE_A, exported.id);
      expect(exported.file?.size).toBe(bytes.length);
      const files = await readZip(bytes);
      expect(JSON.parse(files['manifest.json'].toString())).toMatchObject({ format: 'localess', kind: 'SCHEMA', count: 2 });
      const lines = files['schemas.jsonl']
        .toString()
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
      expect(lines.map(line => line.name)).toEqual(['colors', 'page']);
      expect(lines.every(line => !('id' in line))).toBe(true);

      const imported = await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes);
      expect(imported).toMatchObject({ status: 'FINISHED', counts: { created: 2, updated: 0, unchanged: 0, skipped: 0 } });
      expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, SPACE_B))).map(s => s.name).sort()).toEqual(['colors', 'page']);
      expect((await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes)).counts).toMatchObject({ created: 0, unchanged: 2 });
    });

    it('keeps the references between schemas: they are names', async () => {
      const bytes = await localessZip('SCHEMA', [
        { name: 'hero', type: 'NODE', fields: [{ name: 'title', kind: 'TEXT' }] },
        { name: 'landing', type: 'ROOT', fields: [{ name: 'top', kind: 'SCHEMA', schemas: ['hero'] }] },
      ]);
      expect((await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes)).counts).toMatchObject({ created: 2 });
      const [landing] = await t.db
        .select()
        .from(schemas)
        .where(and(eq(schemas.spaceId, SPACE_B), eq(schemas.name, 'landing')));
      expect(landing.fields).toEqual([{ name: 'top', kind: 'SCHEMA', schemas: ['hero'] }]);
    });

    it('still imports an old .lls.zip', async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'SCHEMA' }),
        'schemas.json': JSON.stringify([{ id: 'legacy', type: 'ENUM', values: [{ name: 'A', value: 'a' }] }]),
      });
      expect(await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes)).toMatchObject({ status: 'FINISHED', counts: { created: 1 } });
    });

    it('refuses a schema name that is twice in the file', async () => {
      const bytes = await localessZip('SCHEMA', [
        { name: 'twice', type: 'ENUM', values: [] },
        { name: 'twice', type: 'ENUM', values: [] },
      ]);
      expect(await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes)).toMatchObject({
        status: 'ERROR',
        problems: [{ path: 'schemas[1].name', message: 'duplicate name' }],
      });
    });

    it('refuses an import whose fields break a rule across fields, writing nothing', async () => {
      const bytes = await localessZip('SCHEMA', [
        { name: 'broken', type: 'ROOT', fields: [{ name: 'hero', kind: 'SCHEMA', schemas: ['gone'] }] },
      ]);
      const imported = await importTask(SPACE_B, 'SCHEMA_IMPORT', bytes);
      expect(imported).toMatchObject({
        status: 'ERROR',
        message: 'The file has 1 problem.',
        problems: [{ path: 'schemas.broken', message: "Schema 'broken': field 'hero' allows 'gone', which does not exist" }],
      });
      expect((await t.db.select().from(schemas).where(eq(schemas.spaceId, SPACE_B))).map(s => s.name)).not.toContain('broken');
    });
  });

  describe('contents and assets', () => {
    it('can no longer be exported or imported (they move with the full export)', async () => {
      for (const kind of ['CONTENT_EXPORT', 'ASSET_EXPORT']) {
        const response = await t.request({
          method: 'POST',
          url: `/api/app/spaces/${SPACE_A}/tasks`,
          headers: headers(),
          payload: { kind },
        });
        expect(response.statusCode).toBe(400);
      }
      for (const kind of ['CONTENT_IMPORT', 'ASSET_IMPORT']) {
        const body = multipart({ kind }, { filename: 'import.zip', bytes: await zipOf({ 'metadata.json': '{}' }) });
        const response = await t.request({
          method: 'POST',
          url: `/api/app/spaces/${SPACE_B}/tasks/import`,
          headers: { ...headers(), 'content-type': body.contentType },
          payload: body.payload,
        });
        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('assets', () => {
    it('publishes its progress as events carrying its kind, not as a column', async () => {
      const publish = vi.spyOn(t.app.get(EventService), 'publish');
      await exportTask(SPACE_A, { kind: 'ASSET_REGEN_METADATA' });
      const events = publish.mock.calls.map(([event]) => event);
      publish.mockRestore();
      expect(events).toContainEqual(
        expect.objectContaining({
          entity: 'tasks',
          op: 'progress',
          kind: 'ASSET_REGEN_METADATA',
          progress: expect.objectContaining({ step: 'Regenerating' }),
        }),
      );
      // Every task and log event says its kind.
      expect(events.filter(it => it.entity === 'tasks' || it.entity === 'task_logs').every(it => it.kind === 'ASSET_REGEN_METADATA')).toBe(
        true,
      );
    });

    it('regenerates metadata of every file', async () => {
      await t.db
        .update(assets)
        .set({ metadata: null })
        .where(and(eq(assets.spaceId, SPACE_A), eq(assets.id, PIC)));
      const regenerated = await exportTask(SPACE_A, { kind: 'ASSET_REGEN_METADATA' });
      // Done: no progress left, the counts in the result.
      expect(regenerated).toMatchObject({ status: 'FINISHED', counts: { created: 0, updated: 1, unchanged: 0, skipped: 0 } });
      const [pic] = await t.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, SPACE_A), eq(assets.id, PIC)));
      expect(pic.metadata).toMatchObject({ type: 'image', format: 'jpg', width: 64, height: 48 });
    });
  });

  describe('translations', () => {
    it('exports a .localess.zip with a manifest and JSON Lines, and imports it into another space', async () => {
      const exported = await exportTask(SPACE_A, { kind: 'TRANSLATION_EXPORT' });
      expect(exported.file?.name).toMatch(/-translations-\d{4}-\d{2}-\d{2}\.localess\.zip$/);
      const files = await readZip(await download(SPACE_A, exported.id));
      expect(JSON.parse(files['manifest.json'].toString())).toMatchObject({
        format: 'localess',
        version: 1,
        kind: 'TRANSLATION',
        count: 2,
        source: { spaceId: SPACE_A, locales: ['en', 'de'] },
      });
      expect(
        files['translations.jsonl']
          .toString()
          .trim()
          .split('\n')
          .map(line => JSON.parse(line)),
      ).toEqual([
        { key: 'farewell', locales: { en: 'Bye' } },
        { key: 'greeting', locales: { en: 'Hello', de: 'Hallo' }, labels: ['ui'] },
      ]);
      await buildDrafts(t, SPACE_B);
      const imported = await importTask(SPACE_B, 'TRANSLATION_IMPORT', await download(SPACE_A, exported.id));
      expect(imported).toMatchObject({ status: 'FINISHED', counts: { created: 2, updated: 0, unchanged: 0, skipped: 0 } });
      expect((await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key).sort()).toEqual([
        'farewell',
        'greeting',
      ]);
      expect(await draftSnapshots(t.db, SPACE_B)).toEqual([]);
      // The same file again changes nothing.
      expect((await importTask(SPACE_B, 'TRANSLATION_IMPORT', await download(SPACE_A, exported.id))).counts).toMatchObject({
        created: 0,
        updated: 0,
        unchanged: 2,
      });
    });

    it('an export that fails while reading ends as ERROR, and the server keeps running', async () => {
      const repository = t.app.get(TranslationTransferRepository);
      const spy = vi.spyOn(repository, 'findBatch').mockRejectedValue(new Error('connection lost'));
      const task = await exportTask(SPACE_A, { kind: 'TRANSLATION_EXPORT' });
      spy.mockRestore();
      expect(task).toMatchObject({ status: 'ERROR', message: 'connection lost' });
      // Give a stray rejection a turn to surface (vitest fails the run on one).
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    it('updates an existing key: its values merged by locale, its description and labels replaced', async () => {
      const bytes = await localessZip('TRANSLATION', [{ key: 'farewell', locales: { de: 'Tschüss' }, description: 'Bye text' }]);
      expect((await importTask(SPACE_B, 'TRANSLATION_IMPORT', bytes)).counts).toMatchObject({ updated: 1 });
      const [row] = await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, SPACE_B), eq(translations.key, 'farewell')));
      expect(row).toMatchObject({ locales: { en: 'Bye', de: 'Tschüss' }, description: 'Bye text' });
    });

    it('imports a key-value JSON file into a locale, creating missing keys', async () => {
      const edited = Buffer.from(JSON.stringify({ greeting: 'Servus', brandNew: 'Neu' }));
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', edited, { locale: 'de' })).toMatchObject({
        status: 'FINISHED',
        counts: { created: 1, updated: 1, unchanged: 0, skipped: 0 },
      });
      const b = await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B));
      expect(b.find(it => it.key === 'greeting')?.locales).toEqual({ en: 'Hello', de: 'Servus' });
      expect(b.find(it => it.key === 'brandNew')).toMatchObject({ locales: { de: 'Neu' } });
    });

    it("still imports an old .llt.zip, values only for the space's locales, logging the skipped ones", async () => {
      const bytes = await zipOf({
        'metadata.json': JSON.stringify({ kind: 'TRANSLATION' }),
        'translations.json': JSON.stringify([{ id: 'only.fr', type: 'STRING', locales: { en: 'Only', fr: 'Seul', it: 'Solo' } }]),
      });
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', bytes);
      expect(task).toMatchObject({ status: 'FINISHED', counts: { created: 1, skipped: 2 } });
      const [row] = await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, SPACE_B), eq(translations.key, 'only.fr')));
      expect(row.locales).toEqual({ en: 'Only' });
      expect((await logs(SPACE_B, task.id)).join('\n')).toMatch(/skipped 2 values of locales not in the space: fr, it/);
    });

    it('refuses to create keys outside the key rule, naming them and writing nothing', async () => {
      const zip = await localessZip('TRANSLATION', [
        { key: 'fine.key', locales: { en: 'Fine' } },
        { key: 'bad key', locales: { en: 'Bad' } },
      ]);
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', zip);
      expect(task).toMatchObject({
        status: 'ERROR',
        message: 'The file has 1 problem.',
        problems: [{ path: 'translations[1].key', message: 'invalid key' }],
      });
      const flat = Buffer.from(JSON.stringify({ 'fine.flat': 'Fine', 'trailing.': 'Bad' }));
      const flatTask = await importTask(SPACE_B, 'TRANSLATION_IMPORT', flat, { locale: 'de' });
      expect(flatTask).toMatchObject({
        status: 'ERROR',
        message: 'The file has 1 problem.',
        problems: [{ path: 'trailing.', message: 'invalid key' }],
      });
      const keys = (await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key);
      expect(keys).not.toContain('fine.key');
      expect(keys).not.toContain('fine.flat');
    });

    it('an invalid key on the last of 10,000 lines writes nothing and names the line', async () => {
      const lines: object[] = Array.from({ length: 9999 }, (_, i) => ({ key: `bulk.k${i}`, locales: { en: `v${i}` } }));
      lines.push({ key: 'bad key', locales: { en: 'x' } });
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', await localessZip('TRANSLATION', lines));
      expect(task).toMatchObject({ status: 'ERROR', problems: [{ path: 'translations[9999].key', message: 'invalid key' }] });
      const keys = (await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key);
      expect(keys.some(key => key.startsWith('bulk.'))).toBe(false);
    });

    it('refuses a key that is twice in the file, naming the second line', async () => {
      const bytes = await localessZip('TRANSLATION', [
        { key: 'dup.key', locales: { en: 'One' } },
        { key: 'dup.other', locales: { en: 'x' } },
        { key: 'dup.key', locales: { en: 'Two' } },
      ]);
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', bytes);
      expect(task).toMatchObject({ status: 'ERROR', problems: [{ path: 'translations[2].key', message: 'duplicate key' }] });
      const keys = (await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key);
      expect(keys).not.toContain('dup.key');
    });

    it('a file with 150 problems lists the first 100 of them', async () => {
      const lines = Array.from({ length: 150 }, (_, i) => ({ key: `bad key ${i}`, locales: { en: 'x' } }));
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', await localessZip('TRANSLATION', lines));
      expect(task.status).toBe('ERROR');
      expect(task.message).toBe('The file has 150 problems; the first 100 are listed.');
      expect(task.problems).toHaveLength(100);
    });

    it('lists a line that is not a translation as a problem', async () => {
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', await localessZip('TRANSLATION', [{ key: 'ok.x', locales: 'nope' }]));
      expect(task).toMatchObject({ status: 'ERROR', problems: [{ path: 'translations[0].locales' }] });
    });

    it('keeps a value another user saves in another locale while the import runs', async () => {
      await t.db.insert(translations).values({ id: newUuid(), spaceId: SPACE_B, key: 'race.key', locales: { en: 'Old' } });
      const repository = t.app.get(TranslationTransferRepository);
      const original = repository.insertBatch.bind(repository);
      const spy = vi.spyOn(repository, 'insertBatch').mockImplementation(async (...args) => {
        // Saved from the editor between the import's read and its write.
        await t.db
          .update(translations)
          .set({ locales: { en: 'Old', de: 'Gleichzeitig' } })
          .where(and(eq(translations.spaceId, SPACE_B), eq(translations.key, 'race.key')));
        return original(...args);
      });
      const task = await importTask(
        SPACE_B,
        'TRANSLATION_IMPORT',
        await localessZip('TRANSLATION', [{ key: 'race.key', locales: { en: 'New' } }]),
      );
      spy.mockRestore();
      expect(task.status).toBe('FINISHED');
      const [row] = await t.db
        .select()
        .from(translations)
        .where(and(eq(translations.spaceId, SPACE_B), eq(translations.key, 'race.key')));
      expect(row.locales).toEqual({ en: 'New', de: 'Gleichzeitig' });
    });

    it('a failure while writing leaves nothing behind', async () => {
      const repository = t.app.get(TranslationTransferRepository);
      const original = repository.insertBatch.bind(repository);
      let calls = 0;
      const spy = vi.spyOn(repository, 'insertBatch').mockImplementation(async (...args) => {
        if (++calls === 2) throw new Error('disk full');
        return original(...args);
      });
      const lines = Array.from({ length: 1200 }, (_, i) => ({ key: `half.k${i}`, locales: { en: 'x' } }));
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', await localessZip('TRANSLATION', lines));
      spy.mockRestore();
      expect(task).toMatchObject({ status: 'ERROR', message: 'disk full' });
      const keys = (await t.db.select().from(translations).where(eq(translations.spaceId, SPACE_B))).map(it => it.key);
      expect(keys.some(key => key.startsWith('half.'))).toBe(false);
    });

    it('refuses a key-value file that is not a JSON object of strings', async () => {
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', Buffer.from('{not json'), { locale: 'de' })).toMatchObject({
        status: 'ERROR',
        message: 'It is not a JSON file of keys and values.',
      });
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', Buffer.from(JSON.stringify({ a: 1 })), { locale: 'de' })).toMatchObject({
        status: 'ERROR',
        problems: [{ path: 'a' }],
      });
    });

    it('checks the upload: the extension for its format, at most 50 MB of JSON', async () => {
      const post = async (fields: Record<string, string>, filename: string, bytes: Buffer) => {
        const body = multipart(fields, { filename, bytes });
        return t.request({
          method: 'POST',
          url: `/api/app/spaces/${SPACE_B}/tasks/import`,
          headers: { ...headers(), 'content-type': body.contentType },
          payload: body.payload,
        });
      };
      const wrong = await post({ kind: 'TRANSLATION_IMPORT', type: 'translation-json-flat', locale: 'de' }, 'de.zip', Buffer.from('{}'));
      expect(wrong.statusCode).toBe(400);
      expect(wrong.json().message).toMatch(/\.json/);
      expect((await post({ kind: 'TRANSLATION_IMPORT', type: 'translation-full' }, 'all.json', Buffer.from('{}'))).statusCode).toBe(400);
      expect((await post({ kind: 'SCHEMA_IMPORT' }, 'schemas.llt.zip', Buffer.from('PK'))).statusCode).toBe(400);
      // The fields must agree with each other.
      expect((await post({ kind: 'TRANSLATION_IMPORT' }, 'old.llt.zip', Buffer.from('PK'))).statusCode).toBe(400);
      expect((await post({ kind: 'TRANSLATION_IMPORT', type: 'translation-json-flat' }, 'de.json', Buffer.from('{}'))).statusCode).toBe(
        400,
      );
      expect(
        (await post({ kind: 'TRANSLATION_IMPORT', type: 'translation-full', locale: 'de' }, 'a.localess.zip', Buffer.from('PK')))
          .statusCode,
      ).toBe(400);
      const old = await post({ kind: 'TRANSLATION_IMPORT', type: 'translation-full' }, 'old.llt.zip', Buffer.from('PK'));
      expect(old.statusCode).toBe(201);
      expect(old.json()).toMatchObject({ params: { type: 'translation-full' }, file: { name: 'old.llt.zip' } });
      const flat = await post(
        { kind: 'TRANSLATION_IMPORT', type: 'translation-json-flat', locale: 'de' },
        '../My File (1).json',
        Buffer.from('{}'),
      );
      expect(flat.json()).toMatchObject({ params: { type: 'translation-json-flat', locale: 'de' }, file: { name: 'My-File-1-.json' } });
      // Stored under its sanitised name.
      expect(
        await t.app.get<StorageDriver>(STORAGE_DRIVER).stat(`spaces/${SPACE_B}/tasks/${flat.json().id}/My-File-1-.json`),
      ).toBeDefined();
      const tooLarge = await post(
        { kind: 'TRANSLATION_IMPORT', type: 'translation-json-flat', locale: 'de' },
        'de.json',
        Buffer.alloc(50 * 1024 * 1024 + 1, ' '),
      );
      expect(tooLarge.statusCode).toBe(413);
      await t.app.get(TaskWorker).whenIdle();
    });

    it('refuses a single-locale import into a locale the space does not have', async () => {
      const task = await importTask(SPACE_B, 'TRANSLATION_IMPORT', Buffer.from(JSON.stringify({ greeting: 'Salut' })), { locale: 'fr' });
      expect(task).toMatchObject({ status: 'ERROR', message: 'Locale fr is not in the space locales.' });
    });
  });

  describe('bad files', () => {
    it('reports the wrong kind of export', async () => {
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', await localessZip('SCHEMA', []))).toMatchObject({
        status: 'ERROR',
        message: 'This is a Schemas export.',
      });
    });

    it('reports files that are not archives', async () => {
      expect(await importTask(SPACE_B, 'TRANSLATION_IMPORT', Buffer.from('not a zip'))).toMatchObject({
        status: 'ERROR',
        message: 'It is not a Localess export file.',
      });
    });

    it('reports invalid data as problems by line, without writing anything', async () => {
      const count = async () => (await t.db.select().from(schemas).where(eq(schemas.spaceId, SPACE_B))).length;
      const before = await count();
      const task = await importTask(SPACE_B, 'SCHEMA_IMPORT', await localessZip('SCHEMA', [{ name: 'xx', type: 'NOPE' }]));
      expect(task.status).toBe('ERROR');
      expect(task.message).toMatch(/^The file has \d+ problems?\.$/);
      expect(task.problems[0].path).toMatch(/^schemas\[0\]/);
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
// More spaces for the queue, by the names the assertions use.
const SPACE_T = '00000000-0000-7000-8000-0000000000e1';
const SPACE_U = '00000000-0000-7000-8000-0000000000e2';
const SPACE_V = '00000000-0000-7000-8000-0000000000e3';

describe('task worker: queue', () => {
  let t: TestApp;

  beforeAll(async () => {
    // The worker is driven by hand here.
    t = await createTestApp({ LOCALESS_TASK_WORKER: 'false' });
    for (const id of [SPACE_S, SPACE_T, SPACE_U, SPACE_V]) await insertSpace(t.db, { id, name: id, locales: [en], defaultLocale: en });
  });

  afterAll(() => t?.close());

  // Each test leaves the queue empty: its tasks are deleted at the end.
  const clear = () => t.db.delete(tasks);

  it('hands each task to exactly one claimant, oldest first', async () => {
    await t.db.insert(tasks).values([
      { id: Q.older, spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-01') },
      { id: Q.newer, spaceId: SPACE_T, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-02') },
    ]);
    const worker = t.app.get(TaskWorker);
    const claims = await Promise.all([worker.claim(), worker.claim(), worker.claim()]);
    const claimed = claims.filter(Boolean).map(it => it!.id);
    expect(claimed.sort()).toEqual([Q.older, Q.newer]);
    const rows = await t.db.select().from(tasks);
    expect(rows.every(row => row.status === 'IN_PROGRESS' && row.lockedBy === worker.workerId)).toBe(true);
    await clear();
  });

  it('never claims a second task of a space while one runs; another space goes ahead', async () => {
    await t.db.insert(tasks).values([
      { id: newUuid(), spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'IN_PROGRESS', lockedBy: 'other', heartbeatAt: new Date() },
      { id: newUuid(), spaceId: SPACE_S, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-01') },
      { id: newUuid(), spaceId: SPACE_T, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-02') },
    ]);
    const worker = t.app.get(TaskWorker);
    expect((await worker.claim())?.spaceId).toBe(SPACE_T);
    expect(await worker.claim()).toBeUndefined();
    await clear();
  });

  it('two simultaneous claimants of one space: one gets a task, the other nothing', async () => {
    await t.db.insert(tasks).values([
      { id: newUuid(), spaceId: SPACE_U, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-01') },
      { id: newUuid(), spaceId: SPACE_U, kind: 'SCHEMA_EXPORT', status: 'QUEUED', createdAt: new Date('2026-01-02') },
    ]);
    const worker = t.app.get(TaskWorker);
    const claims = await Promise.all([worker.claim(), worker.claim()]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await clear();
  });

  it('an instance that stopped frees its space after 5 minutes without a heartbeat; a live one keeps its tasks', async () => {
    const gone = newUuid();
    const alive = newUuid();
    await t.db.insert(tasks).values([
      {
        id: gone,
        spaceId: SPACE_T,
        kind: 'SCHEMA_EXPORT',
        status: 'IN_PROGRESS',
        lockedBy: 'gone',
        heartbeatAt: new Date(Date.now() - 6 * 60_000),
      },
      {
        id: alive,
        spaceId: SPACE_U,
        kind: 'SCHEMA_EXPORT',
        status: 'IN_PROGRESS',
        lockedBy: 'alive',
        heartbeatAt: new Date(Date.now() - 6 * 60_000),
      },
    ]);
    // The live instance beats: its task's lock is fresh again.
    await t.app.get(TaskRepository).heartbeat('alive');
    await t.app.get(TaskWorker).failStale();
    expect((await t.db.select().from(tasks).where(eq(tasks.id, gone)))[0].status).toBe('ERROR');
    expect((await t.db.select().from(tasks).where(eq(tasks.id, alive)))[0].status).toBe('IN_PROGRESS');
    await clear();
  });

  it('marks tasks interrupted mid-run as failed instead of running them again', async () => {
    await t.db.insert(tasks).values([
      {
        id: Q.stuck,
        spaceId: SPACE_S,
        kind: 'SCHEMA_IMPORT',
        status: 'IN_PROGRESS',
        lockedBy: 'gone',
        heartbeatAt: new Date(Date.now() - STALE_AFTER_MS - 1000),
      },
      { id: Q.running, spaceId: SPACE_V, kind: 'SCHEMA_IMPORT', status: 'IN_PROGRESS', lockedBy: 'alive', heartbeatAt: new Date() },
    ]);
    await t.app.get(TaskWorker).failStale();
    const [stuck] = await t.db.select().from(tasks).where(eq(tasks.id, Q.stuck));
    const [running] = await t.db.select().from(tasks).where(eq(tasks.id, Q.running));
    expect(stuck).toMatchObject({ status: 'ERROR', lockedBy: null, heartbeatAt: null });
    expect(stuck.finishedAt).toBeInstanceOf(Date);
    const lines = await t.db.select().from(taskLogs).where(eq(taskLogs.taskId, Q.stuck));
    expect(lines).toEqual([expect.objectContaining({ level: 'ERROR', message: 'Interrupted: the server running it stopped' })]);
    expect(running.status).toBe('IN_PROGRESS');
  });

  it('a claimed task has started_at and a heartbeat; a finished one finished_at and no lock', async () => {
    await clear();
    const id = newUuid();
    await t.db.insert(tasks).values({ id, spaceId: SPACE_V, kind: 'SCHEMA_EXPORT', status: 'QUEUED' });
    const worker = t.app.get(TaskWorker);
    const claimed = await worker.claim();
    expect(claimed).toMatchObject({ id, status: 'IN_PROGRESS', lockedBy: worker.workerId });
    expect(claimed?.startedAt).toBeInstanceOf(Date);
    expect(claimed?.heartbeatAt).toBeInstanceOf(Date);
    await t.app.get(TaskRepository).finish(claimed!, worker.workerId, { status: 'FINISHED' });
    const [done] = await t.db.select().from(tasks).where(eq(tasks.id, id));
    expect(done).toMatchObject({ status: 'FINISHED', lockedBy: null, heartbeatAt: null });
    expect(done.finishedAt!.getTime()).toBeGreaterThanOrEqual(done.startedAt!.getTime());
    await clear();
  });
});
