import type { Express } from 'express';
import express from 'express';
import { writeFileSync } from 'fs';
import sharp from 'sharp';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route-level tests for the three asset endpoints, against the **real** `CDN` router.
 *
 * `config.ts` calls `initializeApp()` at module scope and then `storageService.bucket()`, which
 * throws without a bucket name — historically the reason these routes had no route-level coverage
 * (see the note in `compression.test.ts`). That is an *environment* problem, not a reason to mock
 * modules: firebase-admin reads `FIREBASE_CONFIG`, so supplying one makes the real module graph
 * importable. Nothing here uses `vi.mock`; the Storage and Firestore calls are spied on the real
 * exported objects, so the router, its middleware and the handlers under test are genuine.
 *
 * The env has to be set before the module graph loads, which is why the imports are dynamic.
 */
const MD5 = 'abc123==';

let CDN: express.Router;
let bucket: { file: (path: string) => unknown };
let firestoreService: { doc: (path: string) => unknown };

beforeAll(async () => {
  process.env['FIREBASE_CONFIG'] = JSON.stringify({ projectId: 'test-project', storageBucket: 'test-project.appspot.com' });
  process.env['GCLOUD_PROJECT'] = 'test-project';
  const config = await import('../config');
  bucket = config.bucket as never;
  firestoreService = config.firestoreService as never;
  CDN = (await import('./cdn')).CDN;
});

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
  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality }).toBuffer();
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

interface StoredAsset {
  bytes: Buffer;
  type: string;
  extension: string;
  /** Omitted to simulate an asset whose dimensions were never recorded. */
  metadata?: { width: number; height: number };
  /** Simulates an upload still in flight: the Firestore doc exists, the object does not. */
  storageMissing?: boolean;
  /** Simulates a deleted asset still referenced by published content. */
  documentMissing?: boolean;
}

function given(asset: StoredAsset): void {
  const file = {
    getMetadata: asset.storageMissing ? vi.fn().mockRejectedValue(new Error('not found')) : vi.fn().mockResolvedValue([{ md5Hash: MD5 }]),
    download: vi.fn().mockImplementation(async (options?: { destination: string }) => {
      if (options?.destination) {
        writeFileSync(options.destination, asset.bytes);
        return undefined;
      }
      return [asset.bytes];
    }),
  };
  vi.spyOn(bucket, 'file').mockReturnValue(file as never);
  vi.spyOn(firestoreService, 'doc').mockReturnValue({
    get: vi.fn().mockResolvedValue({
      exists: !asset.documentMissing,
      data: () => ({ name: 'photo', extension: asset.extension, type: asset.type, metadata: asset.metadata }),
    }),
  } as never);
}

function app(): Express {
  // eslint-disable-next-line new-cap
  const instance = express();
  instance.use(CDN);
  return instance;
}

const URL = '/api/v1/spaces/s1/assets/a1';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('asset routes — the passthrough pair', () => {
  it('/original serves the stored bytes inline', async () => {
    const bytes = await jpegFixture();
    given({ bytes, type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(`${URL}/original`);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('inline');
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.body.length).toBe(bytes.length);
  });

  it('/download serves the same bytes as an attachment', async () => {
    const bytes = await jpegFixture();
    given({ bytes, type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(`${URL}/download`);

    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body.length).toBe(bytes.length);
  });

  it.each([['/original'], ['/download']])('%s rejects a transform parameter rather than ignoring it', async route => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(`${URL}${route}?w=100`);

    expect(res.status).toBe(400);
    expect(res.text).toContain('w');
  });

  it('answers a matching If-None-Match with 304 and never downloads', async () => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const first = await request(app()).get(`${URL}/original`);
    const second = await request(app()).get(`${URL}/original`).set('If-None-Match', first.headers['etag']);

    expect(first.headers['etag']).toBe(`"${MD5}-orig"`);
    expect(second.status).toBe(304);
  });

  it('caches a genuinely missing asset hard', async () => {
    given({ bytes: Buffer.alloc(0), type: 'image/jpeg', extension: '.jpg', documentMissing: true, storageMissing: true });

    const res = await request(app()).get(`${URL}/original`);

    expect(res.status).toBe(404);
    expect(res.headers['cache-control']).toContain('max-age=604800');
  });

  it('does not cache a 404 while an upload is still in flight', async () => {
    given({ bytes: Buffer.alloc(0), type: 'image/jpeg', extension: '.jpg', storageMissing: true });

    const res = await request(app()).get(`${URL}/original`);

    expect(res.status).toBe(404);
    expect(res.headers['cache-control']).toBe('no-cache');
  });
});

describe('asset routes — the transform route normalises quality', () => {
  it('re-encodes a bare still JPEG rather than serving the uploaded bytes', async () => {
    const bytes = await jpegFixture(95);
    given({ bytes, type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(URL);

    expect(res.status).toBe(200);
    // Format preserved, bytes not: the q95 upload comes back at the encoder's default.
    expect(res.headers['content-type']).toContain('image/jpeg');
    expect(res.body.length).toBeLessThan(bytes.length);
  });

  it('gives a bare request and /original different ETags, since they return different bytes', async () => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const rendition = await request(app()).get(URL);
    const stored = await request(app()).get(`${URL}/original`);

    expect(stored.headers['etag']).toBe(`"${MD5}-orig"`);
    expect(rendition.headers['etag']).not.toBe(stored.headers['etag']);
  });

  it('separates two qualities that produce different bytes', async () => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const low = await request(app()).get(`${URL}?w=100&q=10`);
    const high = await request(app()).get(`${URL}?w=100&q=90`);

    expect(low.headers['etag']).not.toBe(high.headers['etag']);
    expect(low.body.length).toBeLessThan(high.body.length);
  });

  it('leaves an SVG alone, since there is no raster encoder for it', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    given({ bytes: svg, type: 'image/svg+xml', extension: '.svg' });

    const res = await request(app()).get(URL);

    expect(res.headers['content-type']).toContain('image/svg+xml');
    expect(res.body.length).toBe(svg.length);
  });
});

describe('asset routes — animations', () => {
  it('serves a bare animated GIF as stored rather than decoding every frame', async () => {
    const gif = await animatedGifFixture();
    given({ bytes: gif, type: 'image/gif', extension: '.gif' });

    const res = await request(app()).get(URL);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(gif.length);
  });

  it('resizes an animation when asked, keeping every frame', async () => {
    const gif = await animatedGifFixture(4);
    given({ bytes: gif, type: 'image/gif', extension: '.gif' });

    const res = await request(app()).get(`${URL}?w=40`);
    const meta = await sharp(res.body, { animated: true }).metadata();

    expect(res.status).toBe(200);
    expect(meta.pages).toBe(4);
    expect(meta.width).toBe(40);
  });
});

describe('asset routes — parameters removed in v4', () => {
  it('rejects ?download and names the /download route', async () => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(`${URL}?download`);

    expect(res.status).toBe(400);
    expect(res.text).toContain('/download');
  });

  it('rejects f=original and names the /original route', async () => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(`${URL}?f=original`);

    expect(res.status).toBe(400);
    expect(res.text).toContain('/original');
  });

  it('caches a rejection for an hour so a bad URL cannot re-enter the function', async () => {
    given({ bytes: await jpegFixture(), type: 'image/jpeg', extension: '.jpg' });

    const res = await request(app()).get(`${URL}?f=bogus`);

    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toContain('max-age=3600');
  });
});
