import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assets, spaces } from '../src/infra/database/schema.js';
import { newUuid } from '../src/infra/database/id.js';
import { seedAsset, seedContent, seedSpace, seedTranslations, TOKEN_PUBLIC } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';
import { S1 } from './ids.js';

/**
 * Moving a space from Firebase: traffic for the old asset URLs may arrive before or while the space is imported.
 * Nothing in that window may be cached, or broken images outlive the import by a week.
 */
describe('v1 API while a space is being imported from Firebase', () => {
  let t: TestApp;
  let assetId: string;

  beforeAll(async () => {
    t = await createTestApp();
    await seedSpace(t);
    await seedContent(t);
    await seedTranslations(t);
    assetId = newUuid();
    await seedAsset(t, { id: assetId, bytes: Buffer.from('logo'), type: 'text/plain', extension: '.txt' });
    await t.db.update(assets).set({ legacyId: 'FirestoreAsset000001' }).where(eq(assets.id, assetId));
  });

  afterAll(() => t?.close());

  const get = (url: string) => t.request({ method: 'GET', url });
  const setSpace = (values: { legacyId?: string | null; importStatus?: string | null }) =>
    t.db.update(spaces).set(values).where(eq(spaces.id, S1));

  it('answers an unknown old space id with an uncached 404, so it works once the import has run', async () => {
    const response = await get('/api/v1/spaces/FirestoreSpace/assets/FirestoreAsset000001/original');
    expect(response.statusCode).toBe(404);
    expect(response.headers['cache-control']).toBe('no-cache');
  });

  for (const [status, message] of [
    ['IMPORTING', 'This space is being imported'],
    ['FAILED', 'The import of this space failed'],
  ] as const) {
    it(`answers 503 (no-store, Retry-After) on every space route while ${status}`, async () => {
      await setSpace({ legacyId: 'FirestoreSpace', importStatus: status });
      try {
        for (const url of [
          '/api/v1/spaces/FirestoreSpace/assets/FirestoreAsset000001/original',
          `/api/v1/spaces/${S1}/assets/${assetId}/original`,
          `/api/v1/spaces/${S1}/assets/${newUuid()}`,
          `/api/v1/spaces/${S1}/translations/en?token=${TOKEN_PUBLIC}`,
          `/api/v1/spaces/${S1}/contents/slugs/home?token=${TOKEN_PUBLIC}`,
          `/api/v1/spaces/${S1}/links?token=${TOKEN_PUBLIC}`,
        ]) {
          const response = await get(url);
          expect(response.statusCode, url).toBe(503);
          expect(response.headers['cache-control'], url).toBe('no-store');
          expect(response.headers['retry-after'], url).toBe('60');
          expect(response.json().message, url).toBe(message);
        }
      } finally {
        await setSpace({ legacyId: null, importStatus: null });
      }
    });
  }

  it('serves the old URL as usual once the import has finished', async () => {
    await setSpace({ legacyId: 'FirestoreSpace', importStatus: null });
    try {
      const response = await get('/api/v1/spaces/FirestoreSpace/assets/FirestoreAsset000001/original');
      expect(response.statusCode).toBe(301);
      expect(response.headers.location).toBe(`/api/v1/spaces/FirestoreSpace/assets/${assetId}/original`);
      expect((await get(response.headers.location as string)).statusCode).toBe(200);
    } finally {
      await setSpace({ legacyId: null });
    }
  });

  it('keeps the cached 404 for an asset of a UUID space that does not exist', async () => {
    const response = await get(`/api/v1/spaces/${newUuid()}/assets/${newUuid()}/original`);
    expect(response.statusCode).toBe(404);
    expect(response.headers['cache-control']).toBe('public, max-age=604800, s-maxage=604800');
  });
});
