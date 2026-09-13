import compression from 'compression';
import express, { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

/**
 * `v1.ts` mounts `compression()` with its default filter rather than an explicit allow-list of
 * routes. That is a deliberate choice, and this suite is what makes it safe: the filter decides
 * purely from the response `Content-Type`, so the contract worth pinning is "every JSON body the
 * API returns is compressed, and nothing the asset route serves is".
 *
 * Re-mounting the middleware on a throwaway app rather than importing `v1.ts` keeps this a unit
 * test — importing the real app pulls in `config.ts`, which initialises firebase-admin.
 */
function appServing(contentType: string, body: string | Buffer): Express {
  // eslint-disable-next-line new-cap
  const app = express();
  app.use(compression());
  app.get('/', (_req, res) => {
    res.contentType(contentType).send(body);
  });
  return app;
}

/** Comfortably over compression's 1kb default threshold, and repetitive like real payloads. */
const LARGE_JSON = JSON.stringify({ items: Array.from({ length: 200 }, (_, i) => ({ id: i, label: 'hello world' })) });
/** Incompressible bytes, so a negative result cannot be explained away by "gzip made it bigger". */
const LARGE_BINARY = Buffer.from(Array.from({ length: 4096 }, (_, i) => (i * 2654435761) % 256));

describe('v1 response compression', () => {
  it('compresses JSON responses', async () => {
    const res = await request(appServing('application/json', LARGE_JSON)).get('/').set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('marks compressed responses as varying on Accept-Encoding', async () => {
    const res = await request(appServing('application/json', LARGE_JSON)).get('/').set('Accept-Encoding', 'gzip');
    expect(res.headers['vary']).toMatch(/Accept-Encoding/i);
  });

  it('round-trips the JSON body unchanged', async () => {
    const res = await request(appServing('application/json', LARGE_JSON)).get('/').set('Accept-Encoding', 'gzip');
    // supertest/superagent inflates transparently, so this asserts the payload survives the trip.
    expect(JSON.stringify(res.body)).toBe(LARGE_JSON);
  });

  it('leaves the response alone when the client does not accept gzip', async () => {
    const res = await request(appServing('application/json', LARGE_JSON)).get('/').set('Accept-Encoding', 'identity');
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  it('leaves bodies under the 1kb threshold uncompressed', async () => {
    const res = await request(appServing('application/json', JSON.stringify({ message: 'not found' })))
      .get('/')
      .set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBeUndefined();
  });

  // The asset route (`cdn.ts`) serves these. Compressing them burns CPU for nothing — they are
  // already compressed formats — and would strip the Content-Length that range requests rely on.
  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/quicktime', 'application/zip', 'application/pdf'])(
    'does not compress %s',
    async contentType => {
      const res = await request(appServing(contentType, LARGE_BINARY)).get('/').set('Accept-Encoding', 'gzip');
      expect(res.headers['content-encoding']).toBeUndefined();
    }
  );

  // SVG is the one asset type that is plain text, so it is the one asset type worth compressing.
  it('does compress image/svg+xml', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg">${'<rect width="10" height="10"/>'.repeat(100)}</svg>`;
    const res = await request(appServing('image/svg+xml', svg)).get('/').set('Accept-Encoding', 'gzip');
    expect(res.headers['content-encoding']).toBe('gzip');
  });
});
