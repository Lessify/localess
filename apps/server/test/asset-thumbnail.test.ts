import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import ffmpegStatic from 'ffmpeg-static';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { newUuid } from '../src/infra/database/id.js';
import { assets } from '../src/infra/database/schema.js';
import { STORAGE_DRIVER, type StorageDriver } from '../src/infra/storage/storage.driver.js';
import { AssetDeliveryService } from '../src/modules/assets/services/asset-delivery.service.js';
import { S1 } from './ids.js';
import { seedAsset, type SeededAsset, seedSpace } from './seed.js';
import { createTestApp, TestApp } from './test-app.js';

const FFMPEG = ffmpegStatic as unknown as string | null;

/**
 * The platform thumbnail (`AssetDeliveryService.findThumbnail`): one stored WebP per image or video, kept even with
 * LOCALESS_RENDITION_CACHE=off, since every screen of the platform shows it.
 */
describe('asset thumbnail', () => {
  let t: TestApp;
  let delivery: AssetDeliveryService;

  beforeAll(async () => {
    t = await createTestApp({ LOCALESS_RENDITION_CACHE: 'off', ...(FFMPEG ? { LOCALESS_FFMPEG_PATH: FFMPEG } : {}) });
    await seedSpace(t);
    delivery = t.app.get(AssetDeliveryService);
  });

  afterAll(() => t?.close());

  const given = async (asset: Omit<SeededAsset, 'id'>): Promise<string> => {
    const id = newUuid();
    await seedAsset(t, { id, ...asset });
    return id;
  };
  const stored = (id: string) => join(t.storageDir, `spaces/${S1}/assets/${id}/renditions/thumbnail.webp`);
  const exists = (path: string) =>
    stat(path).then(
      () => true,
      () => false,
    );

  it('fits an image inside 512 px and stores it, the rendition cache off or not', async () => {
    const bytes = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#336699' } })
      .png()
      .toBuffer();
    const id = await given({ bytes, type: 'image/png', extension: '.png' });
    const thumbnail = await delivery.findThumbnail(S1, id);
    expect(await sharp(thumbnail!.output).metadata()).toMatchObject({ format: 'webp', width: 512, height: 256 });
    expect(thumbnail!.md5).toBeTruthy();
    expect((await readFile(stored(id))).equals(thumbnail!.output)).toBe(true);
  });

  it('serves the stored thumbnail on later requests', async () => {
    const id = await given({
      bytes: await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000' } })
        .png()
        .toBuffer(),
      type: 'image/png',
      extension: '.png',
    });
    await delivery.findThumbnail(S1, id);
    const marker = await sharp({ create: { width: 7, height: 7, channels: 3, background: '#fff' } })
      .webp()
      .toBuffer();
    await t.app.get<StorageDriver>(STORAGE_DRIVER).put(`spaces/${S1}/assets/${id}/renditions/thumbnail.webp`, marker);
    expect((await delivery.findThumbnail(S1, id))!.output.equals(marker)).toBe(true);
  });

  it('rasterises an SVG', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20"/></svg>');
    const id = await given({ bytes: svg, type: 'image/svg+xml', extension: '.svg' });
    expect(await sharp((await delivery.findThumbnail(S1, id))!.output).metadata()).toMatchObject({ format: 'webp', width: 40, height: 20 });
  });

  it.skipIf(!FFMPEG)('takes a frame of a video', async () => {
    const video = join(t.storageDir, 'fixture.mp4');
    execFileSync(FFMPEG as string, ['-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=10', '-pix_fmt', 'yuv420p', '-y', video], {
      stdio: 'ignore',
    });
    const id = await given({ bytes: await readFile(video), type: 'video/mp4', extension: '.mp4' });
    expect(await sharp((await delivery.findThumbnail(S1, id))!.output).metadata()).toMatchObject({
      format: 'webp',
      width: 320,
      height: 240,
    });
    expect(await exists(stored(id))).toBe(true);
  });

  it('has none for other files, a missing file or one that cannot be read', async () => {
    const text = await given({ bytes: Buffer.from('notes'), type: 'text/plain', extension: '.txt' });
    const missing = await given({ bytes: Buffer.from('x'), type: 'image/png', extension: '.png', storageMissing: true });
    const broken = await given({ bytes: Buffer.from('not an image'), type: 'image/jpeg', extension: '.jpg' });
    expect(await delivery.findThumbnail(S1, text)).toBeUndefined();
    expect(await delivery.findThumbnail(S1, missing)).toBeUndefined();
    expect(await delivery.findThumbnail(S1, broken)).toBeUndefined();
    expect(await delivery.findThumbnail(S1, newUuid())).toBeUndefined();
    expect(await exists(stored(broken))).toBe(false);
  });

  it('leaves no file behind when the asset is deleted while its thumbnail is made', async () => {
    const bytes = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#123456' } })
      .jpeg()
      .toBuffer();
    const id = await given({ bytes, type: 'image/jpeg', extension: '.jpg' });
    const repository = delivery['assetRepository'];
    const findOne = repository.findOne.bind(repository);
    let calls = 0;
    // The row is read before generating, and gone when checked again after the write.
    repository.findOne = async (spaceId: string, assetId: string) => {
      calls++;
      if (calls === 2) await t.db.delete(assets).where(eq(assets.id, id));
      return findOne(spaceId, assetId);
    };
    try {
      await delivery.findThumbnail(S1, id);
    } finally {
      repository.findOne = findOne;
    }
    expect(await exists(join(t.storageDir, `spaces/${S1}/assets/${id}`))).toBe(false);
  });
});
