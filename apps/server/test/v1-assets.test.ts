import { execFileSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assets } from '../src/database/schema.js';
import { STORAGE_DRIVER, StorageDriver } from '../src/storage/storage.driver.js';
import { seedAsset, seedSpace, SeededAsset } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';

/** Ported from functions/src/v1/cdn-assets.test.ts, against real rows and files instead of spies. */

/** A JPEG deliberately encoded at a high quality, as a camera export or design tool would. */
async function jpegFixture(quality = 95): Promise<Buffer> {
  const width = 400;
  const height = 300;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const noise = Math.round(Math.sin(x * 0.05) * Math.cos(y * 0.07) * 30);
      raw[i] = Math.max(0, Math.min(255, Math.round((x * 255) / width) + noise));
      raw[i + 1] = Math.max(0, Math.min(255, Math.round((y * 255) / height) + noise));
      raw[i + 2] = (x * y) % 255;
    }
  }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality })
    .toBuffer();
}

/** A genuinely multi-frame GIF; frames must differ or the encoder collapses them to one. */
async function animatedGifFixture(frames = 4): Promise<Buffer> {
  const width = 80;
  const height = 60;
  const raw = Buffer.alloc(width * height * frames * 3);
  for (let f = 0; f < frames; f++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (f * height + y) * width * 3 + x * 3;
        raw[i] = (x * 3 + f * 50) % 255;
        raw[i + 1] = (y * 3 + f * 30) % 255;
        raw[i + 2] = (f * 60) % 255;
      }
    }
  }
  return sharp(raw, { raw: { width, height: height * frames, channels: 3, pageHeight: height } })
    .gif()
    .toBuffer();
}

/** The ffmpeg-static dev dependency, so the video branch is tested without a system ffmpeg. */
const FFMPEG = ffmpegStatic as unknown as string | null;

describe('v1 asset routes', () => {
  let t: TestApp;
  let n = 0;

  beforeAll(async () => {
    t = await createTestApp(FFMPEG ? { LOCALESS_FFMPEG_PATH: FFMPEG } : {});
    await seedSpace(t);
  });

  afterAll(() => t?.close());

  beforeEach(() => vi.restoreAllMocks());

  /** Seeds a fresh asset per test and returns its URL plus the base64 md5 ETags are built from. */
  async function given(asset: Omit<SeededAsset, 'id'>): Promise<{ url: string; md5: string; id: string }> {
    const id = `asset${++n}`;
    const md5 = await seedAsset(t, { id, ...asset });
    return { url: `/api/v1/spaces/s1/assets/${id}`, md5, id };
  }

  const get = (url: string, headers: Record<string, string> = {}) => t.request({ method: 'GET', url, headers });

  describe('the passthrough pair', () => {
    it('/original serves the stored bytes inline', async () => {
      const bytes = await jpegFixture();
      const { url } = await given({ bytes, type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}/original`);
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-disposition']).toContain('inline');
      expect(response.headers['content-type']).toContain('image/jpeg');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.rawPayload.equals(bytes)).toBe(true);
    });

    it('/download serves the same bytes as an attachment', async () => {
      const bytes = await jpegFixture();
      const { url } = await given({ bytes, type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}/download`);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.rawPayload.length).toBe(bytes.length);
    });

    it.each([['/original'], ['/download']])('%s rejects a transform parameter rather than ignoring it', async route => {
      const { url } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}${route}?w=100`);
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('w');
    });

    it('answers a matching If-None-Match with 304, with the GCS-compatible ETag', async () => {
      const { url, md5 } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const first = await get(`${url}/original`);
      expect(first.headers['etag']).toBe(`"${md5}-orig"`);
      const second = await get(`${url}/original`, { 'if-none-match': first.headers['etag'] as string });
      expect(second.statusCode).toBe(304);
    });

    it('caches a genuinely missing asset hard', async () => {
      const response = await get('/api/v1/spaces/s1/assets/doesnotexist/original');
      expect(response.statusCode).toBe(404);
      expect(response.headers['cache-control']).toContain('max-age=604800');
    });

    it('does not cache a 404 while an upload is still in flight', async () => {
      const { url } = await given({ bytes: Buffer.from('x'), type: 'image/jpeg', extension: '.jpg', storageMissing: true });
      const response = await get(`${url}/original`);
      expect(response.statusCode).toBe(404);
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.json()).toEqual({ message: 'Not found, upload may still be in progress.', status: 'NOT_FOUND' });
    });

    it('serves byte ranges, so video players can seek', async () => {
      const bytes = Buffer.from('0123456789abcdef');
      const { url } = await given({ bytes, type: 'video/mp4', extension: '.mp4' });
      const partial = await get(`${url}/original`, { range: 'bytes=4-7' });
      expect(partial.statusCode).toBe(206);
      expect(partial.headers['content-range']).toBe('bytes 4-7/16');
      expect(partial.body).toBe('4567');
      const suffix = await get(`${url}/original`, { range: 'bytes=-3' });
      expect(suffix.body).toBe('def');
      const unsatisfiable = await get(`${url}/original`, { range: 'bytes=99-' });
      expect(unsatisfiable.statusCode).toBe(416);
      const full = await get(`${url}/original`);
      expect(full.headers['accept-ranges']).toBe('bytes');
      expect(full.headers['content-length']).toBe('16');
    });

    it('serves untrusted types as attachments under a sandboxing CSP', async () => {
      const { url } = await given({ bytes: Buffer.from('<script>alert(1)</script>'), type: 'text/html', extension: '.html' });
      const response = await get(`${url}/original`);
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-security-policy']).toContain('sandbox');
    });
  });

  describe('the transform route normalises quality', () => {
    it('re-encodes a bare still JPEG rather than serving the uploaded bytes', async () => {
      const bytes = await jpegFixture(95);
      const { url } = await given({ bytes, type: 'image/jpeg', extension: '.jpg' });
      const response = await get(url);
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/jpeg');
      expect(response.rawPayload.length).toBeLessThan(bytes.length);
    });

    it('gives a bare request and /original different ETags, since they return different bytes', async () => {
      const { url, md5 } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const rendition = await get(url);
      const stored = await get(`${url}/original`);
      expect(stored.headers['etag']).toBe(`"${md5}-orig"`);
      expect(rendition.headers['etag']).not.toBe(stored.headers['etag']);
    });

    it('separates two qualities that produce different bytes', async () => {
      const { url } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const low = await get(`${url}?w=100&q=10`);
      const high = await get(`${url}?w=100&q=90`);
      expect(low.headers['etag']).not.toBe(high.headers['etag']);
      expect(low.rawPayload.length).toBeLessThan(high.rawPayload.length);
    });

    it('converts formats and names the download after the request', async () => {
      const { url } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}?w=100&f=webp`);
      expect(response.headers['content-type']).toBe('image/webp');
      expect(response.headers['content-disposition']).toContain('photo-w100-fwebp.webp');
      expect((await sharp(response.rawPayload).metadata()).width).toBe(100);
    });

    it('redirects an oversized request to the size the source can produce', async () => {
      const { url } = await given({
        bytes: await jpegFixture(),
        type: 'image/jpeg',
        extension: '.jpg',
        metadata: { width: 400, height: 300 },
      });
      const response = await get(`${url}?w=1000`);
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe(`${url}?w=400`);
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, s-maxage=31536000');
    });

    it('leaves an SVG alone, since there is no raster encoder for it', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
      const { url } = await given({ bytes: svg, type: 'image/svg+xml', extension: '.svg' });
      const response = await get(url);
      expect(response.headers['content-type']).toContain('image/svg+xml');
      expect(response.rawPayload.equals(svg)).toBe(true);
    });

    it('caches generated renditions and serves repeats from the cache', async () => {
      const { url, id } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const first = await get(`${url}?w=120&q=50`);
      const renditions = await readdir(join(t.storageDir, `spaces/s1/assets/${id}/renditions`));
      expect(renditions).toEqual(['w120-q50-fjpeg']);

      const storage = t.app.get<StorageDriver>(STORAGE_DRIVER);
      const read = vi.spyOn(storage, 'read');
      const second = await get(`${url}?w=120&q=50`);
      expect(second.rawPayload.equals(first.rawPayload)).toBe(true);
      // Only the cached rendition was read, never the original.
      expect(read.mock.calls.map(([key]) => key)).toEqual([`spaces/s1/assets/${id}/renditions/w120-q50-fjpeg`]);
    });
  });

  describe('animations', () => {
    it('serves a bare animated GIF as stored rather than decoding every frame', async () => {
      const gif = await animatedGifFixture();
      const { url } = await given({ bytes: gif, type: 'image/gif', extension: '.gif' });
      const response = await get(url);
      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(gif)).toBe(true);
    });

    it('resizes an animation when asked, keeping every frame', async () => {
      const { url } = await given({ bytes: await animatedGifFixture(4), type: 'image/gif', extension: '.gif' });
      const response = await get(`${url}?w=40`);
      const meta = await sharp(response.rawPayload, { animated: true }).metadata();
      expect(response.statusCode).toBe(200);
      expect(meta.pages).toBe(4);
      expect(meta.width).toBe(40);
    });
  });

  describe('parameters removed in v4', () => {
    it('rejects ?download and names the /download route', async () => {
      const { url } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}?download`);
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('/download');
    });

    it('rejects f=original and names the /original route', async () => {
      const { url } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}?f=original`);
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('/original');
    });

    it('caches a rejection for an hour so a bad URL cannot re-enter the function', async () => {
      const { url } = await given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });
      const response = await get(`${url}?f=bogus`);
      expect(response.statusCode).toBe(400);
      expect(response.headers['cache-control']).toContain('max-age=3600');
    });
  });

  describe('the animation budget is enforced before the read', () => {
    it('rejects an oversized animation off stored metadata, without reading the file', async () => {
      const { url, id } = await given({
        bytes: await animatedGifFixture(4),
        type: 'image/gif',
        extension: '.gif',
        metadata: { type: 'image', width: 2000, height: 2000, pages: 100 },
      });
      const storage = t.app.get<StorageDriver>(STORAGE_DRIVER);
      const read = vi.spyOn(storage, 'read');
      const response = await get(`${url}?w=200`);
      expect(response.statusCode).toBe(400);
      expect(response.body).toContain('too large');
      expect(read.mock.calls.some(([key]) => key.includes(id))).toBe(false);
    });

    it('still serves a thumbnail of an oversized animation, which decodes one frame', async () => {
      const { url } = await given({
        bytes: await animatedGifFixture(4),
        type: 'image/gif',
        extension: '.gif',
        metadata: { type: 'image', width: 2000, height: 2000, pages: 100 },
      });
      expect((await get(`${url}?w=40&thumbnail`)).statusCode).toBe(200);
    });

    it('falls through to the post-read check when metadata predates the pages field', async () => {
      const { url } = await given({ bytes: await animatedGifFixture(4), type: 'image/gif', extension: '.gif' });
      expect((await get(`${url}?w=40`)).statusCode).toBe(200);
    });
  });

  describe('resolveAsset on content', () => {
    it('returns the metadata consumers lay out with', async () => {
      const { id } = await given({
        bytes: await jpegFixture(),
        type: 'image/jpeg',
        extension: '.jpg',
        metadata: { width: 400, height: 300, format: 'jpeg' },
      });
      const { PublicContentService } = await import('../src/public-api/public-content.service.js');
      const resolved = await t.app.get(PublicContentService).resolveAssets('s1', [id, 'missing']);
      expect(resolved).toEqual({
        [id]: {
          id,
          name: 'photo',
          extension: '.jpg',
          type: 'image/jpeg',
          size: expect.any(Number),
          alt: 'A photo',
          width: 400,
          height: 300,
        },
      });
    });

    it('skips folders', async () => {
      await t.db.insert(assets).values({ id: 'folder1', spaceId: 's1', kind: 'FOLDER', name: 'Folder' });
      const { PublicContentService } = await import('../src/public-api/public-content.service.js');
      expect(await t.app.get(PublicContentService).resolveAssets('s1', ['folder1'])).toEqual({});
    });
  });

  it.skipIf(!FFMPEG)('renders a video thumbnail at the requested width, and caches it', async () => {
    const dir = t.storageDir;
    const video = join(dir, 'fixture.mp4');
    execFileSync(FFMPEG as string, ['-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10', '-pix_fmt', 'yuv420p', '-y', video], {
      stdio: 'ignore',
    });
    const { readFile } = await import('node:fs/promises');
    const { url } = await given({ bytes: await readFile(video), type: 'video/mp4', extension: '.mp4' });
    const response = await get(`${url}?w=100&thumbnail`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/webp');
    expect((await sharp(response.rawPayload).metadata()).width).toBe(100);
    expect(response.headers['content-disposition']).toContain('photo-w100-thumbnail.webp');
    const again = await get(`${url}?w=100&thumbnail`);
    expect(again.rawPayload.equals(response.rawPayload)).toBe(true);
  });
});
