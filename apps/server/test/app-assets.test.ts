import { createHash } from 'node:crypto';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { ContentData } from '@localess/shared';
import { and, eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { assets, contents } from '../src/infra/database/schema.js';
import { AssetDeliveryService } from '../src/modules/assets/services/asset-delivery.service.js';
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

    it('stores the file by its upload name, kept on a rename: the API shows and downloads only `name`', async () => {
      await t.app.get(AssetDeliveryService).whenIdle();
      const dir = join(t.storageDir, `spaces/${S1}/assets/${photo.id}`);
      // The upload, and what is generated from it: the thumbnail, made in the background after the upload.
      expect((await readdir(dir)).sort()).toEqual(['Sunset.Final.JPG', 'renditions']);
      expect(await readdir(join(dir, 'renditions'))).toEqual(['thumbnail.webp']);
      expect(photo).not.toHaveProperty('originalName');

      const renamed = await editor.patch(`${base}/${photo.id}`, { name: 'Bay' });
      expect(renamed.statusCode, renamed.body).toBe(200);
      expect((await readdir(dir)).sort()).toEqual(['Sunset.Final.JPG', 'renditions']);
      const download = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/assets/${photo.id}/download` });
      expect(download.statusCode).toBe(200);
      expect(download.headers['content-disposition']).toContain('Bay.JPG');
      await editor.patch(`${base}/${photo.id}`, { name: 'Sunset.Final' });
    });

    describe('thumbnail', () => {
      const thumbnail = (id: string, headers: Record<string, string> = {}) =>
        t.request({ method: 'GET', url: `${base}/${id}/thumbnail`, headers: { cookie, ...headers } });

      it('serves one WebP for the platform, never enlarged, kept by the browser for a year', async () => {
        const response = await thumbnail(photo.id);
        expect(response.statusCode, response.body).toBe(200);
        expect(response.headers['content-type']).toBe('image/webp');
        expect(response.headers['cache-control']).toBe('private, max-age=31536000, immutable');
        // Stored 400x300 with EXIF orientation 6: upright, and smaller than 512 px, so kept at its size.
        expect(await sharp(response.rawPayload).metadata()).toMatchObject({ format: 'webp', width: 300, height: 400 });

        const again = await thumbnail(photo.id, { 'if-none-match': String(response.headers.etag) });
        expect(again.statusCode).toBe(304);
      });

      it('fits a large image inside 512 px, generated on the first request when none is stored', async () => {
        const created = await upload({}, { filename: 'wide.jpg', type: 'image/jpeg', bytes: await jpeg(1600, 900).toBuffer() });
        const id = created.json().id;
        await t.app.get(AssetDeliveryService).whenIdle();
        const stored = join(t.storageDir, `spaces/${S1}/assets/${id}/renditions/thumbnail.webp`);
        await rm(stored);

        const response = await thumbnail(id);
        expect(response.statusCode).toBe(200);
        expect(await sharp(response.rawPayload).metadata()).toMatchObject({ width: 512, height: 288 });
        expect((await sharp(stored).metadata()).width).toBe(512);
        await editor.delete(`${base}/${id}`);
        await t.app.get(StorageSweeperService).whenIdle();
      });

      it('shows the first frame of an animation', async () => {
        const frames = 3;
        const raw = Buffer.alloc(20 * 20 * frames * 3, 0);
        const gif = await sharp(raw, { raw: { width: 20, height: 20 * frames, channels: 3, pageHeight: 20 } })
          .gif()
          .toBuffer();
        const id = (await upload({}, { filename: 'spin.gif', type: 'image/gif', bytes: gif })).json().id;
        const metadata = await sharp((await thumbnail(id)).rawPayload).metadata();
        expect(metadata).toMatchObject({ format: 'webp', width: 20, height: 20 });
        expect(metadata.pages ?? 1).toBe(1);
        await editor.delete(`${base}/${id}`);
        await t.app.get(StorageSweeperService).whenIdle();
      });

      it('answers 404 for a file that is not an image or a video, and for a folder', async () => {
        const id = (await upload({}, { filename: 'notes.txt', type: 'text/plain', bytes: Buffer.from('notes') })).json().id;
        expect((await thumbnail(id)).statusCode).toBe(404);
        expect((await thumbnail(nested.id)).statusCode).toBe(404);
        expect((await thumbnail(newUuid())).statusCode).toBe(404);
        await editor.delete(`${base}/${id}`);
        await t.app.get(StorageSweeperService).whenIdle();
      });

      it('is for signed-in users only', async () => {
        expect((await t.request({ method: 'GET', url: `${base}/${photo.id}/thumbnail` })).statusCode).toBe(401);
      });
    });

    describe('preview, original and download', () => {
      const get = (path: string, headers: Record<string, string> = {}) =>
        t.request({ method: 'GET', url: `${base}/${path}`, headers: { cookie, ...headers } });
      const removeAsset = async (id: string) => {
        await editor.delete(`${base}/${id}`);
        await t.app.get(StorageSweeperService).whenIdle();
      };

      it('previews a large image as one WebP inside 2048 px, made on the first request and stored', async () => {
        const id = (await upload({}, { filename: 'pano.jpg', type: 'image/jpeg', bytes: await jpeg(3000, 1500).toBuffer() })).json().id;
        await t.app.get(AssetDeliveryService).whenIdle();
        const stored = join(t.storageDir, `spaces/${S1}/assets/${id}/renditions`);
        // Not made on upload: most images are never previewed.
        expect(await readdir(stored)).toEqual(['thumbnail.webp']);

        const response = await get(`${id}/preview`);
        expect(response.statusCode, response.body).toBe(200);
        expect(response.headers['content-type']).toBe('image/webp');
        expect(response.headers['cache-control']).toBe('private, max-age=31536000, immutable');
        expect(await sharp(response.rawPayload).metadata()).toMatchObject({ format: 'webp', width: 2048, height: 1024 });
        expect((await readdir(stored)).sort()).toEqual(['preview.webp', 'thumbnail.webp']);
        expect((await get(`${id}/preview`, { 'if-none-match': String(response.headers.etag) })).statusCode).toBe(304);
        await removeAsset(id);
      });

      it('never enlarges a small image, only re-encodes it, upright', async () => {
        // Stored 400x300 with EXIF orientation 6.
        expect(await sharp((await get(`${photo.id}/preview`)).rawPayload).metadata()).toMatchObject({
          format: 'webp',
          width: 300,
          height: 400,
        });
      });

      it('shows an SVG and an animation as stored: vector, or it plays', async () => {
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20"/></svg>');
        const vector = (await upload({}, { filename: 'logo.svg', type: 'image/svg+xml', bytes: svg })).json().id;
        const raw = Buffer.alloc(20 * 20 * 3 * 3, 0);
        // Frames that differ: identical ones are merged into a still image.
        for (let f = 0; f < 3; f++) raw.fill(f * 80, f * 1200, (f + 1) * 1200);
        const gif = await sharp(raw, { raw: { width: 20, height: 60, channels: 3, pageHeight: 20 } })
          .gif()
          .toBuffer();
        const animation = (await upload({}, { filename: 'spin.gif', type: 'image/gif', bytes: gif })).json().id;

        const svgPreview = await get(`${vector}/preview`);
        expect(svgPreview.headers['content-type']).toBe('image/svg+xml');
        expect(svgPreview.rawPayload.equals(svg)).toBe(true);
        // Opened on its own, the SVG runs sandboxed: no script on the app's origin.
        expect(svgPreview.headers['content-security-policy']).toContain('sandbox');
        expect((await get(`${animation}/preview`)).rawPayload.equals(gif)).toBe(true);
        await removeAsset(vector);
        await removeAsset(animation);
      });

      it('has no preview for a video or another file: the dialog shows the thumbnail', async () => {
        const id = (await upload({}, { filename: 'notes.txt', type: 'text/plain', bytes: Buffer.from('notes') })).json().id;
        expect((await get(`${id}/preview`)).statusCode).toBe(404);
        expect((await get(`${nested.id}/preview`)).statusCode).toBe(404);
        await removeAsset(id);
      });

      it('streams the original inline, with Range requests for the video player', async () => {
        const response = await get(`${photo.id}/original`);
        expect(response.statusCode).toBe(200);
        expect(response.rawPayload.equals(photoBytes)).toBe(true);
        expect(response.headers['content-type']).toBe('image/jpeg');
        expect(response.headers['content-disposition']).toMatch(/^inline/);
        expect(response.headers['accept-ranges']).toBe('bytes');

        const part = await get(`${photo.id}/original`, { range: 'bytes=0-9' });
        expect(part.statusCode).toBe(206);
        expect(part.headers['content-range']).toBe(`bytes 0-9/${photoBytes.length}`);
        expect(part.rawPayload.equals(photoBytes.subarray(0, 10))).toBe(true);
      });

      it('downloads the original as an attachment named after the asset, revalidated as its name can change', async () => {
        const response = await get(`${photo.id}/download`);
        expect(response.statusCode).toBe(200);
        expect(response.rawPayload.equals(photoBytes)).toBe(true);
        expect(response.headers['content-disposition']).toMatch(/^attachment/);
        expect(response.headers['content-disposition']).toContain('Sunset.Final.JPG');
        expect(response.headers['cache-control']).toBe('private, no-cache');
        expect((await get(`${newUuid()}/download`)).statusCode).toBe(404);
      });

      it('is for signed-in users only', async () => {
        for (const path of ['preview', 'original', 'download']) {
          expect((await t.request({ method: 'GET', url: `${base}/${photo.id}/${path}` })).statusCode).toBe(401);
        }
      });
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

  describe('a file asset without its file (imported from Firebase without it)', () => {
    const putFile = (assetId: string, file: { filename: string; type: string; bytes: Buffer }, as = cookie) => {
      const body = multipart({}, file);
      return t.request({
        method: 'PUT',
        url: `${base}/${assetId}/file`,
        headers: { ...XHR, cookie: as, 'content-type': body.contentType },
        payload: body.payload,
      });
    };
    const missing = async () => {
      const id = newUuid();
      await t.db.insert(assets).values({
        id,
        spaceId: S1,
        kind: 'FILE',
        name: 'recording',
        originalName: 'recording.mov',
        extension: '.mov',
        type: 'video/quicktime',
        size: 108_726_933,
        md5: null,
        alt: 'The demo',
      });
      return id;
    };
    const bytes = Buffer.from('the whole recording');

    it('says it misses its file, and its public URLs answer 404 without being cached', async () => {
      const id = await missing();
      expect((await contentReader.get(`${base}/${id}`)).json()).toMatchObject({ id, kind: 'FILE', missingFile: true });
      const original = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/assets/${id}/original` });
      expect(original.statusCode).toBe(404);
      expect(original.headers['cache-control']).toBe('no-cache');
      // A file uploaded the usual way has its file.
      const [uploaded] = (await contentReader.get(`${base}?kind=FILE`)).json().items.filter((it: { id: string }) => it.id !== id);
      expect(uploaded.missingFile).toBeUndefined();
    });

    it('takes a file under the same id: name, folder and alt kept; type, size and md5 from the upload; served at once', async () => {
      const id = await missing();
      const response = await putFile(id, { filename: 'recording.mp4', type: 'video/mp4', bytes });
      expect(response.statusCode).toBe(200);
      const asset = response.json();
      expect(asset).toMatchObject({ id, name: 'recording', alt: 'The demo', extension: '.mp4', type: 'video/mp4', size: bytes.length });
      expect(asset.missingFile).toBeUndefined();
      const [row] = await t.db.select().from(assets).where(eq(assets.id, id));
      expect(row.md5).toBe(createHash('md5').update(bytes).digest('base64'));
      const original = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/assets/${id}/original` });
      expect(original.statusCode).toBe(200);
      expect(original.rawPayload).toEqual(bytes);
    });

    it('refuses a second file, a file for an asset that has one, and a folder (409), keeping what is stored', async () => {
      const id = await missing();
      expect((await putFile(id, { filename: 'recording.mp4', type: 'video/mp4', bytes })).statusCode).toBe(200);
      const again = await putFile(id, { filename: 'other.mp4', type: 'video/mp4', bytes: Buffer.from('other') });
      expect(again.statusCode).toBe(409);
      expect(again.json().message).toBe('Only a file asset without its file takes one: upload a new asset to change a file');
      expect((await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/assets/${id}/original` })).rawPayload).toEqual(bytes);
      expect(await readdir(join(t.storageDir, `spaces/${S1}/assets/${id}`))).toEqual(['recording.mp4']);
      const [uploaded] = (await contentReader.get(`${base}?kind=FILE`))
        .json()
        .items.filter((it: { missingFile?: true }) => !it.missingFile);
      expect((await putFile(uploaded.id, { filename: 'x.txt', type: 'text/plain', bytes })).statusCode).toBe(409);
      const folder = (await editor.post(`${base}/folders`, { name: 'Recordings' })).json();
      expect((await putFile(folder.id, { filename: 'x.txt', type: 'text/plain', bytes })).statusCode).toBe(409);
    });

    it('refuses a file over the size limit with 413: the asset still misses its file, nothing is left behind', async () => {
      const id = await missing();
      const response = await putFile(id, { filename: 'big.bin', type: 'application/octet-stream', bytes: Buffer.alloc(1024 * 1024 + 10) });
      expect(response.statusCode).toBe(413);
      expect((await contentReader.get(`${base}/${id}`)).json().missingFile).toBe(true);
      await expect(readdir(join(t.storageDir, `spaces/${S1}/assets/${id}`))).resolves.toEqual([]);
    });

    it('requires ASSET_CREATE, a multipart body and an asset of the space', async () => {
      const id = await missing();
      const readerCookie = await userWithAccess(t, 'r3@example.com', { role: 'VIEWER' });
      expect((await putFile(id, { filename: 'a.txt', type: 'text/plain', bytes }, readerCookie)).statusCode).toBe(403);
      expect((await editor.put(`${base}/${id}/file`, { file: 'nope' })).statusCode).toBe(400);
      expect((await putFile(newUuid(), { filename: 'a.txt', type: 'text/plain', bytes })).statusCode).toBe(404);
      expect((await contentReader.get(`${base}/${id}`)).json().missingFile).toBe(true);
    });
  });
});
