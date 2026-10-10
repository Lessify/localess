import { createHash, randomBytes } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, spaces } from '../src/infra/database/schema.js';
import { api, createTestApp, insertSpace, TestApp, userWithAccess, XHR } from './test-app.js';
import { S1, UUID_V7 } from './ids.js';

/** A multipart body with the fields first, then the file — the order the endpoint expects. */
function multipart(fields: Record<string, string>, file: { filename: string; type: string; bytes: Buffer }) {
  const boundary = `----localess${randomBytes(8).toString('hex')}`;
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\nContent-Type: ${file.type}\r\n\r\n`,
    ),
  );
  parts.push(file.bytes, Buffer.from(`\r\n--${boundary}--\r\n`));
  return { payload: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
}

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
      role: 'custom',
      permissions: ['ASSET_READ', 'ASSET_CREATE', 'ASSET_UPDATE', 'ASSET_DELETE'],
    });
    editor = api(t, cookie);
    contentReader = api(t, await userWithAccess(t, 'reader@example.com', { role: 'custom', permissions: ['CONTENT_READ'] }));
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
  const contentVersion = async () => (await t.db.select().from(spaces).where(eq(spaces.id, S1)))[0].contentVersion;

  let photos: { id: string };
  let nested: { id: string };

  describe('folders', () => {
    it('creates folders at the root and inside folders', async () => {
      photos = (await editor.post(`${base}/folders`, { parentPath: '', name: 'Photos' })).json();
      nested = (await editor.post(`${base}/folders`, { parentPath: photos.id, name: '2026' })).json();
      expect(nested).toMatchObject({ kind: 'FOLDER', name: '2026', parentPath: photos.id });
      expect((await editor.post(`${base}/folders`, { parentPath: 'nope', name: 'X' })).statusCode).toBe(400);
      // A path whose last segment exists but under another parent is not a folder path either.
      expect((await editor.post(`${base}/folders`, { parentPath: nested.id, name: 'X' })).statusCode).toBe(400);
    });
  });

  describe('uploads', () => {
    let photo: Record<string, unknown>;

    it('stores the file and records size, md5, oriented dimensions and the embedded caption', async () => {
      // Stored 400x300 with EXIF orientation 6 (rotate 90°): it displays as 300x400 portrait.
      const bytes = await jpeg(400, 300)
        .withMetadata({ orientation: 6 })
        .withExif({ IFD0: { ImageDescription: 'Sunset over the bay' } })
        .toBuffer();
      const response = await upload(
        { parentPath: `${photos.id}/${nested.id}` },
        { filename: 'Sunset.Final.JPG', type: 'image/jpeg', bytes },
      );
      expect(response.statusCode, response.body).toBe(201);
      photo = response.json();
      expect(photo).toMatchObject({
        kind: 'FILE',
        name: 'Sunset.Final',
        extension: '.JPG',
        type: 'image/jpeg',
        size: bytes.length,
        md5: createHash('md5').update(bytes).digest('base64'),
        parentPath: `${photos.id}/${nested.id}`,
        alt: 'Sunset over the bay',
        metadata: { type: 'image', format: 'jpg', width: 300, height: 400, orientation: 'portrait' },
      });
      expect(photo).not.toHaveProperty('inProgress', true);
    });

    it('is served by the public API straight away, with an ETag built from the stored md5', async () => {
      const response = await t.request({ method: 'GET', url: `/api/v1/spaces/${S1}/assets/${photo['id']}/original` });
      expect(response.statusCode).toBe(200);
      expect(response.headers.etag).toBe(`"${photo['md5']}-orig"`);
    });

    it('records the frame count of animations and keeps explicit name, alt and source', async () => {
      const frames = 3;
      const raw = Buffer.alloc(20 * 20 * frames * 3, 0);
      for (let f = 0; f < frames; f++) raw.fill(f * 80, f * 1200, (f + 1) * 1200);
      const gif = await sharp(raw, { raw: { width: 20, height: 20 * frames, channels: 3, pageHeight: 20 } })
        .gif()
        .toBuffer();
      const response = await upload(
        { parentPath: '', name: 'Spinner', alt: 'Loading', source: 'https://example.com/spinner' },
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
        { parentPath: 'missing' },
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
      const readerCookie = await userWithAccess(t, 'r2@example.com', { role: 'custom', permissions: ['ASSET_READ'] });
      expect((await upload({}, { filename: 'a.txt', type: 'text/plain', bytes: Buffer.from('x') }, readerCookie)).statusCode).toBe(403);
      expect((await editor.post(`${base}/files`, { file: 'nope' })).statusCode).toBe(400);
    });
  });

  describe('browsing', () => {
    it('lists a folder (folders first), filters by MIME prefix, name prefix and ids, and counts', async () => {
      const root = (await contentReader.get(`${base}?parentPath=`)).json();
      expect(root.map((a: { name: string }) => a.name)).toEqual(['Photos', 'Spinner', 'terms']);
      expect((await contentReader.get(`${base}?parentPath=&fileType=image`)).json().map((a: { name: string }) => a.name)).toEqual([
        'Photos',
        'Spinner',
      ]);
      expect((await contentReader.get(`${base}?name=sun`)).json().map((a: { name: string }) => a.name)).toEqual(['Sunset.Final']);
      expect((await contentReader.get(`${base}/count?kind=FILE`)).json()).toEqual({ count: 3 });
      expect((await contentReader.post(`${base}/folders`, { parentPath: '', name: 'x' })).statusCode).toBe(403);
    });

    it('`?ids=` matches asset UUIDs exactly, not the Firestore id an asset was imported with', async () => {
      const [first] = (await contentReader.get(`${base}?parentPath=&kind=FILE`)).json();
      expect(first.id).toMatch(UUID_V7);
      await t.db.update(assets).set({ legacyId: 'FirestoreAsset000001' }).where(eq(assets.id, first.id));
      expect((await contentReader.get(`${base}?ids=FirestoreAsset000001`)).json()).toEqual([]);
      expect((await contentReader.get(`${base}?ids=${first.id}`)).json()[0]).toMatchObject({ id: first.id, legacyId: 'FirestoreAsset000001' });
    });
  });

  describe('editing', () => {
    it('renames and sets or clears alt text, moving the content cache version', async () => {
      const [file] = (await editor.get(`${base}?name=spinner`)).json();
      const before = await contentVersion();
      expect((await editor.patch(`${base}/${file.id}`, { name: 'Loader', alt: '' })).json()).toMatchObject({ name: 'Loader' });
      expect((await editor.get(`${base}/${file.id}`)).json()).not.toHaveProperty('alt');
      expect(await contentVersion()).toBeGreaterThan(before);
    });

    it('moves files between folders, but never folders', async () => {
      const [file] = (await editor.get(`${base}?name=terms`)).json();
      expect((await editor.put(`${base}/${file.id}/parent`, { parentPath: photos.id })).json().parentPath).toBe(photos.id);
      expect((await editor.put(`${base}/${file.id}/parent`, { parentPath: 'missing' })).statusCode).toBe(400);
      expect((await editor.put(`${base}/${nested.id}/parent`, { parentPath: '' })).statusCode).toBe(400);
    });
  });

  describe('deleting', () => {
    it('deletes a folder with everything under it, rows and files', async () => {
      const filesBefore = await storedFiles();
      expect(filesBefore).toHaveLength(3);
      expect((await editor.delete(`${base}/${photos.id}`)).statusCode).toBe(204);
      expect((await editor.get(`${base}?parentPath=`)).json().map((a: { name: string }) => a.name)).toEqual(['Loader']);
      // The photo (nested two levels down) and the moved PDF are gone from storage too.
      expect(await storedFiles()).toHaveLength(1);
      expect((await editor.delete(`${base}/${photos.id}`)).statusCode).toBe(404);
    });
  });
});
