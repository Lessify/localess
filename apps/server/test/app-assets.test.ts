import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { ContentData } from '@localess/shared';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { assets, contents } from '../src/infra/database/schema.js';
import { StorageSweeperService } from '../src/shared/services/storage-sweeper.service.js';
import { S1, UUID_V7 } from './ids.js';
import { api, createTestApp, insertSpace, multipart, TestApp, userWithAccess, XHR } from './test-app.js';

const jpeg = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: '#88aa44' } }).jpeg();

describe('app API: assets', () => {
  let t: TestApp;
  let cookie: string;
  let editor: ReturnType<typeof api>;
  let contentReader: ReturnType<typeof api>;
  const base = `/api/app/spaces/${S1}/assets`;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_UPLOAD_MAX_MB: '1' });
    await insertSpace(t.db, { id: S1, name: 'S', locales: [{ id: 'en', name: 'English' }], defaultLocale: { id: 'en', name: 'English' } });
    cookie = await userWithAccess(t, 'editor@example.com', {
      role: 'EDITOR',
    });
    editor = api(t, cookie);
    contentReader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'VIEWER' }));
  });

  afterAll(() => t?.close());

  const upload = (fields: Record<string, string>, file: { filename: string; type: string; bytes: Buffer }, as = cookie) => {
    const body = multipart(fields, file);
    return t.request({
      method: 'POST',
      url: `${base}/files`,
      headers: { ...XHR, cookie: as, 'content-type': body.contentType },
      payload: body.payload,
    });
  };
  const storedFiles = async () => {
    try {
      return await readdir(join(t.storageDir, `spaces/${S1}/assets`));
    } catch {
      return [];
    }
  };

  let photos: { id: string };
  let nested: { id: string };

  describe('folders', () => {
    it('creates folders at the root and inside folders', async () => {
      photos = (await editor.post(`${base}/folders`, { name: 'Photos' })).json();
      nested = (await editor.post(`${base}/folders`, { parentId: photos.id, name: '2026' })).json();
      expect(nested).toMatchObject({ kind: 'FOLDER', name: '2026', parentId: photos.id });
      expect(nested).not.toHaveProperty('parentPath');
      expect((await editor.post(`${base}/folders`, { parentId: 'nope', name: 'X' })).statusCode).toBe(400);
      const missing = await editor.post(`${base}/folders`, { parentId: newUuid(), name: 'X' });
      expect(missing.statusCode).toBe(400);
      expect(missing.json().message).toBe('No such folder');
    });

    it('lists every folder of the space for the editor', async () => {
      const response = await contentReader.get(`${base}/folders`);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        { id: nested.id, parentId: photos.id, name: '2026' },
        { id: photos.id, name: 'Photos' },
      ]);
    });
  });

  describe('what a folder and a file carry', () => {
    it('refuses file fields on a new folder, and alt text on a folder', async () => {
      const withFileFields = await editor.post(`${base}/folders`, { name: 'Docs', type: 'image/png', extension: '.png' });
      expect(withFileFields.statusCode).toBe(400);
      const folder = (await editor.post(`${base}/folders`, { name: 'Docs' })).json();
      expect(folder).not.toHaveProperty('type');
      expect(folder).not.toHaveProperty('extension');
      const alt = await editor.patch(`${base}/${folder.id}`, { alt: 'Folders have no alt text' });
      expect(alt.statusCode).toBe(400);
      expect(alt.json().message).toBe('Only files have alt text');
      await editor.delete(`${base}/${folder.id}`);
    });

    it('gives every uploaded file a name, a type and an extension (empty when the name has none)', async () => {
      const readme = await upload({}, { filename: 'README', type: 'application/octet-stream', bytes: Buffer.from('hello') });
      expect(readme.statusCode).toBe(201);
      expect(readme.json()).toMatchObject({ kind: 'FILE', name: 'README', extension: '', type: 'application/octet-stream', size: 5 });
      await editor.delete(`${base}/${readme.json().id}`);
      await t.app.get(StorageSweeperService).whenIdle();
    });

    it('refuses an extension without its dot, and a file with no name', async () => {
      const files = await storedFiles();
      const noDot = await upload({ extension: 'png' }, { filename: 'logo.png', type: 'image/png', bytes: Buffer.from('x') });
      expect(noDot.statusCode).toBe(400);
      const nameless = await upload({}, { filename: '', type: 'text/plain', bytes: Buffer.from('x') });
      expect(nameless.statusCode).toBe(400);
      expect(nameless.json().message).toBe('The file needs a name');
      expect(await storedFiles()).toEqual(files);
    });
  });

  describe('uploads', () => {
    let photo: Record<string, unknown> & { id: string };
    let photoBytes: Buffer;

    it('stores the file and records size, md5, oriented dimensions and the embedded caption', async () => {
      // Stored 400x300 with EXIF orientation 6 (rotate 90°): it displays as 300x400 portrait.
      const bytes = await jpeg(400, 300)
        .withMetadata({ orientation: 6 })
        .withExif({ IFD0: { ImageDescription: 'Sunset over the bay' } })
        .toBuffer();
      photoBytes = bytes;
      const response = await upload({ parentId: nested.id }, { filename: 'Sunset.Final.JPG', type: 'image/jpeg', bytes });
      expect(response.statusCode, response.body).toBe(201);
      photo = response.json();
      expect(photo).toMatchObject({
        kind: 'FILE',
        name: 'Sunset.Final',
        extension: '.JPG',
        type: 'image/jpeg',
        size: bytes.length,
        parentId: nested.id,
        alt: 'Sunset over the bay',
        metadata: { type: 'image', format: 'jpg', width: 300, height: 400, orientation: 'portrait' },
      });
      // The response is the stored asset: there is no in-progress state. The md5 stays on the server (ETags).
      expect(photo).not.toHaveProperty('inProgress');
      expect(photo).not.toHaveProperty('md5');
    });

    it('is served by the public API straight away, with an ETag built from the stored md5', async () => {
      const response = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/assets/${photo['id']}/original` });
      expect(response.statusCode).toBe(200);
      expect(response.headers.etag).toBe(`"${createHash('md5').update(photoBytes).digest('base64')}-orig"`);
    });

    it('records the frame count of animations and keeps explicit name, alt and source', async () => {
      const frames = 3;
      const raw = Buffer.alloc(20 * 20 * frames * 3, 0);
      for (let f = 0; f < frames; f++) raw.fill(f * 80, f * 1200, (f + 1) * 1200);
      const gif = await sharp(raw, { raw: { width: 20, height: 20 * frames, channels: 3, pageHeight: 20 } })
        .gif()
        .toBuffer();
      const response = await upload(
        { name: 'Spinner', alt: 'Loading', source: 'https://example.com/spinner' },
        { filename: 'x.gif', type: 'image/gif', bytes: gif },
      );
      expect(response.json()).toMatchObject({
        name: 'Spinner',
        extension: '.gif',
        alt: 'Loading',
        source: 'https://example.com/spinner',
        metadata: { pages: 3, width: 20, height: 20 },
      });
    });

    it('stores other files without metadata', async () => {
      const response = await upload({}, { filename: 'terms.pdf', type: 'application/pdf', bytes: Buffer.from('%PDF-1.4 fake') });
      expect(response.statusCode).toBe(201);
      expect(response.json()).not.toHaveProperty('metadata');
    });

    it('refuses an unknown folder, leaving no file behind', async () => {
      const before = await storedFiles();
      const response = await upload(
        { parentId: newUuid() },
        { filename: 'a.jpg', type: 'image/jpeg', bytes: await jpeg(10, 10).toBuffer() },
      );
      expect(response.statusCode).toBe(400);
      expect(await storedFiles()).toEqual(before);
    });

    it('refuses files over the size limit with 413, leaving no file behind', async () => {
      const before = await storedFiles();
      const response = await upload({}, { filename: 'big.bin', type: 'application/octet-stream', bytes: Buffer.alloc(1024 * 1024 + 10) });
      expect(response.statusCode).toBe(413);
      expect(await storedFiles()).toEqual(before);
    });

    it('requires ASSET_CREATE and a multipart body', async () => {
      const readerCookie = await userWithAccess(t, 'r2@example.com', { role: 'VIEWER' });
      expect((await upload({}, { filename: 'a.txt', type: 'text/plain', bytes: Buffer.from('x') }, readerCookie)).statusCode).toBe(403);
      expect((await editor.post(`${base}/files`, { file: 'nope' })).statusCode).toBe(400);
    });
  });

  describe('browsing', () => {
    it('lists a folder (folders first), filters by file type and searches the space, and counts', async () => {
      const root = (await contentReader.get(base)).json().items;
      expect(root.map((a: { name: string }) => a.name)).toEqual(['Photos', 'Spinner', 'terms']);
      expect((await contentReader.get(`${base}?fileType=IMAGE`)).json().items.map((a: { name: string }) => a.name)).toEqual([
        'Photos',
        'Spinner',
      ]);
      expect((await contentReader.get(`${base}?search=sun&deep=true`)).json().items.map((a: { name: string }) => a.name)).toEqual([
        'Sunset.Final',
      ]);
      expect((await contentReader.get(`${base}/count?kind=FILE`)).json()).toEqual({ count: 3 });
      expect((await contentReader.post(`${base}/folders`, { name: 'x' })).statusCode).toBe(403);
    });

    it('answers the UUID and, for an asset imported from Firebase, its Firestore id', async () => {
      const [first] = (await contentReader.get(`${base}?kind=FILE`)).json().items;
      expect(first.id).toMatch(UUID_V7);
      await t.db.update(assets).set({ legacyId: 'FirestoreAsset000001' }).where(eq(assets.id, first.id));
      expect((await contentReader.get(`${base}/${first.id}`)).json()).toMatchObject({ id: first.id, legacyId: 'FirestoreAsset000001' });
    });

    it('lists every file of the space, light, with what an Asset field shows', async () => {
      const files = (await contentReader.get(`${base}/files`)).json<(Record<string, unknown> & { name: string; extension: string })[]>();
      expect(files.map(it => `${it.name}${it.extension}`)).toEqual(['Spinner.gif', 'Sunset.Final.JPG', 'terms.pdf']);
      const sunset = files.find(it => it.name === 'Sunset.Final')!;
      expect(sunset).toEqual({
        id: expect.any(String),
        parentId: expect.any(String),
        name: 'Sunset.Final',
        extension: '.JPG',
        type: 'image/jpeg',
        size: expect.any(Number),
        metadata: { width: 300, height: 400 },
      });
    });
  });

  describe('editing', () => {
    it('renames and sets or clears alt text', async () => {
      const [file] = (await editor.get(`${base}?search=spinner&deep=true`)).json().items;
      expect((await editor.patch(`${base}/${file.id}`, { name: 'Loader', alt: '' })).json()).toMatchObject({ name: 'Loader' });
      expect((await editor.get(`${base}/${file.id}`)).json()).not.toHaveProperty('alt');
    });

    it('moves files and folders: one row, whatever is under it', async () => {
      const [file] = (await editor.get(`${base}?search=terms&deep=true`)).json().items;
      expect((await editor.patch(`${base}/${file.id}`, { parentId: photos.id })).json().parentId).toBe(photos.id);
      expect((await editor.patch(`${base}/${file.id}`, { parentId: newUuid() })).statusCode).toBe(400);
      // A folder moves with everything under it: the photo stays in it.
      const moved = await editor.patch(`${base}/${nested.id}`, { parentId: null });
      expect(moved.statusCode).toBe(200);
      expect(moved.json()).not.toHaveProperty('parentId');
      expect((await editor.get(`${base}?parentId=${nested.id}`)).json().items.map((a: { name: string }) => a.name)).toEqual([
        'Sunset.Final',
      ]);
      await editor.patch(`${base}/${nested.id}`, { parentId: photos.id });
    });

    it('refuses moving a folder into itself or under itself', async () => {
      for (const parentId of [photos.id, nested.id]) {
        const response = await editor.patch(`${base}/${photos.id}`, { parentId });
        expect(response.statusCode).toBe(400);
        expect(response.json().message).toBe('A folder cannot be moved into itself');
      }
    });

    it('refuses a file as the parent', async () => {
      const [file] = (await editor.get(`${base}?search=terms&deep=true`)).json().items;
      const response = await editor.post(`${base}/folders`, { parentId: file.id, name: 'X' });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe('No such folder');
    });
  });

  describe('deleting', () => {
    it('tells how many contents use a file, or any file under a folder, before it is deleted', async () => {
      const [sunset] = await t.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, S1), eq(assets.name, 'Sunset.Final')));
      const [loader] = await t.db
        .select()
        .from(assets)
        .where(and(eq(assets.spaceId, S1), eq(assets.name, 'Loader')));
      const doc = (slug: string, data: Record<string, unknown>) => ({
        id: newUuid(),
        spaceId: S1,
        kind: 'DOCUMENT' as const,
        name: slug,
        slug,
        schema: 'page',
        data: data as ContentData,
      });
      await t.db.insert(contents).values([
        // At any depth, in any locale variant.
        doc('hero', { _id: 'r', _schema: 'page', image: { kind: 'ASSET', uri: sunset.id } }),
        doc('gallery', {
          _id: 'r',
          _schema: 'page',
          body: [{ _id: 'b', _schema: 'card', image_i18n_de: { kind: 'ASSET', uri: sunset.id } }],
        }),
        // Not a reference: another asset, and the id outside an ASSET node.
        doc('other', { _id: 'r', _schema: 'page', image: { kind: 'ASSET', uri: newUuid() }, note: sunset.id }),
      ]);
      const usage = (id: string) => editor.get(`${base}/${id}/usage`);
      expect((await usage(sunset.id)).json()).toEqual({ contents: 2 });
      expect((await usage(photos.id)).json()).toEqual({ contents: 2 });
      expect((await usage(loader.id)).json()).toEqual({ contents: 0 });
      expect((await usage(newUuid())).statusCode).toBe(404);
      await t.db.delete(contents).where(eq(contents.spaceId, S1));
    });

    it('deletes a folder with everything under it, rows and files', async () => {
      const filesBefore = await storedFiles();
      expect(filesBefore).toHaveLength(3);
      expect((await editor.delete(`${base}/${photos.id}`)).statusCode).toBe(204);
      // Their files are queued in the delete and swept right after the commit.
      await t.app.get(StorageSweeperService).whenIdle();
      expect((await editor.get(base)).json().items.map((a: { name: string }) => a.name)).toEqual(['Loader']);
      // The photo (nested two levels down) and the moved PDF are gone from storage too.
      expect(await storedFiles()).toHaveLength(1);
      expect((await editor.delete(`${base}/${photos.id}`)).statusCode).toBe(404);
    });
  });
});
