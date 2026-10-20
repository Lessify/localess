import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../src/infra/storage/storage.driver.js';
import { S1 } from './ids.js';
import { seedAsset, seedSpace } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';

/** LOCALESS_RENDITION_CACHE=off: every transform runs in the request, nothing but the original is stored. */
describe('rendition cache off', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_RENDITION_CACHE: 'off' });
    await seedSpace(t);
  });

  afterAll(() => t?.close());

  it('transforms in the request, with the same cache headers, and stores no rendition', async () => {
    const id = newUuid();
    const bytes = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#336699' } })
      .jpeg()
      .toBuffer();
    await seedAsset(t, { id, bytes, type: 'image/jpeg', extension: '.jpg' });
    const url = `/api/v1/spaces/${S1}/assets/${id}?w=120&q=50`;

    const first = await t.request({ method: 'GET', url });
    expect(first.statusCode).toBe(200);
    expect(first.headers['cache-control']).toBe('public, max-age=31536000, s-maxage=31536000');
    expect((await sharp(first.rawPayload).metadata()).width).toBe(120);
    expect(await readdir(join(t.storageDir, `spaces/${S1}/assets/${id}`))).toEqual(['original']);

    // A repeat transforms again from the original.
    const read = vi.spyOn(t.app.get<StorageDriver>(STORAGE_DRIVER), 'read');
    const second = await t.request({ method: 'GET', url });
    expect(second.rawPayload.equals(first.rawPayload)).toBe(true);
    expect(read.mock.calls.map(([key]) => key)).toEqual([`spaces/${S1}/assets/${id}/original`]);
    expect(await readdir(join(t.storageDir, `spaces/${S1}/assets/${id}`))).toEqual(['original']);
  });
});
