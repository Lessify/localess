import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { exiftool } from 'exiftool-vendored';
import sharp from 'sharp';
import { pickEmbeddedAlt } from './embedded-alt.js';
import { normaliseDuration } from './media-duration.js';
import { resolveOrientedDimensions, resolveRotatedDimensions } from './media-orientation.js';
import { isAnimatedPages } from './image-transform.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';

export interface ExtractedMetadata {
  metadata?: Record<string, unknown>;
  /** Caption embedded in the file, only when the asset has no alt yet. */
  alt?: string;
}

/**
 * Image/video metadata for an uploaded file (was `updateMetadataByRef`, run by the Storage upload
 * trigger): format, oriented dimensions, duration, animation frame count, alpha, embedded caption.
 * Failures degrade to "no metadata" — an upload never fails because a file could not be probed.
 */
@Injectable()
export class AssetMetadataService implements OnApplicationShutdown {
  private readonly logger = new Logger(AssetMetadataService.name);

  constructor(@Inject(STORAGE_DRIVER) private readonly storage: StorageDriver) {}

  async onApplicationShutdown(): Promise<void> {
    await exiftool.end();
  }

  async extract(key: string, type: string, currentAlt: string | null | undefined): Promise<ExtractedMetadata> {
    if (!type.startsWith('image/') && !type.startsWith('video/')) return {};
    const dir = await mkdtemp(join(tmpdir(), 'localess-meta-'));
    try {
      const file = join(dir, 'original');
      await pipeline(this.storage.createReadStream(key), createWriteStream(file));
      return type.startsWith('image/') ? await this.image(file, currentAlt) : await this.video(file);
    } catch (error) {
      this.logger.warn(`Could not read metadata of ${key}: ${error}`);
      return {};
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async image(file: string, currentAlt: string | null | undefined): Promise<ExtractedMetadata> {
    const tags = await exiftool.read(file);
    const { Duration, FileTypeExtension, ImageWidth, ImageHeight, Orientation } = tags;
    const metadata: Record<string, unknown> = { type: 'image' };
    if (FileTypeExtension) metadata['format'] = FileTypeExtension;
    const duration = normaliseDuration(Duration);
    if (duration !== undefined) metadata['duration'] = duration;
    // exiftool reports stored dimensions and the orientation tag separately; combine them.
    const { width, height, orientation } = resolveOrientedDimensions(ImageWidth, ImageHeight, Orientation);
    if (width !== undefined && height !== undefined) Object.assign(metadata, { width, height, orientation });
    // `pages` lets the delivery route reject an oversized animation before reading it.
    try {
      const { pages, hasAlpha } = await sharp(file).metadata();
      if (isAnimatedPages(pages)) metadata['pages'] = pages;
      if (hasAlpha !== undefined) metadata['hasAlpha'] = hasAlpha;
    } catch {
      // sharp can't parse every format exiftool can; keep the exiftool data.
    }
    const alt = pickEmbeddedAlt(tags as unknown as Record<string, unknown>, currentAlt ?? undefined);
    return { metadata, ...(alt ? { alt } : {}) };
  }

  private async video(file: string): Promise<ExtractedMetadata> {
    const { FileTypeExtension, Duration, ImageWidth, ImageHeight, Rotation } = await exiftool.read(file);
    const metadata: Record<string, unknown> = { type: 'video' };
    if (FileTypeExtension) metadata['format'] = FileTypeExtension;
    const duration = normaliseDuration(Duration);
    if (duration !== undefined) metadata['duration'] = duration;
    // A portrait phone video stores landscape dimensions plus a rotation.
    const rotated = resolveRotatedDimensions(ImageWidth, ImageHeight, Rotation);
    if (rotated.width !== undefined && rotated.height !== undefined) {
      Object.assign(metadata, { width: rotated.width, height: rotated.height, orientation: rotated.orientation });
    }
    return { metadata };
  }
}
