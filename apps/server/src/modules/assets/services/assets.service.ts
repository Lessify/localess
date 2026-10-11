import type { Readable } from 'node:stream';
import { BadRequestException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { Asset } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { toAsset } from '../../../shared/transformers/asset.transformer.js';
import { type AssetQuery, AssetsRepository } from '../repositories/assets.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { splitFilename } from '../utils/split-filename.js';
import { assetPrefix, originalKey } from '../utils/storage-keys.js';

export interface UploadInput {
  parentPath: string;
  file: Readable;
  filename: string;
  mimetype: string;
  name?: string;
  extension?: string;
  alt?: string;
  source?: string;
  /** True when the upload hit the size limit: the stream ended early instead of failing. */
  truncated?: () => boolean;
}

function found<T>(result: T | undefined): T {
  if (result === undefined) throw new NotFoundException('Asset not found');
  return result;
}

/**
 * Asset library of a space (was direct `spaces/{s}/assets` access, browser uploads to Storage, and
 * the upload/delete triggers). Files are stored under `spaces/{s}/assets/{id}/original`.
 */
@Injectable()
export class AssetsService {
  constructor(
    private readonly assets: AssetsRepository,
    private readonly spaces: SpaceRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly metadata: AssetMetadataService,
  ) {}

  async list(spaceId: string, query: AssetQuery): Promise<Asset[]> {
    return (await this.assets.findAll(spaceId, query)).map(toAsset);
  }

  count(spaceId: string, kind?: 'FOLDER' | 'FILE'): Promise<number> {
    return this.assets.count(spaceId, kind);
  }

  async get(spaceId: string, id: string): Promise<Asset> {
    return toAsset(found(await this.assets.findById(spaceId, id)));
  }

  async createFolder(spaceId: string, parentPath: string, name: string): Promise<Asset> {
    return toAsset(await this.assets.createFolder(spaceId, parentPath, name));
  }

  /**
   * Streams the file into storage, reads its metadata, then creates the row — so there is never a
   * row without its file (the old flow created the row first, `inProgress`, and let a trigger finish it).
   */
  async upload(spaceId: string, input: UploadInput): Promise<Asset> {
    if (!(await this.spaces.find(spaceId))) throw new NotFoundException('Space not found');
    if (!(await this.assets.isFolderPath(spaceId, input.parentPath))) throw new BadRequestException(`No folder at '${input.parentPath}'`);
    const id = newUuid();
    const key = originalKey(spaceId, id);
    try {
      const stored = await this.storage.put(key, input.file);
      // @fastify/multipart ends a piped stream at the size limit rather than erroring, so a cut-off
      // file would otherwise be stored as if it were complete.
      if (input.truncated?.()) throw new PayloadTooLargeException('File is too large');
      const derived = splitFilename(input.filename);
      const type = input.mimetype || 'application/octet-stream';
      const extracted = await this.metadata.extract(key, type, input.alt);
      const row = await this.assets.createFile(spaceId, {
        id,
        name: input.name || derived.name,
        extension: input.extension ?? derived.extension,
        type,
        size: stored.size,
        md5: stored.md5,
        parentPath: input.parentPath,
        alt: input.alt || extracted.alt || null,
        source: input.source || null,
        metadata: extracted.metadata ?? null,
      });
      return toAsset(row);
    } catch (error) {
      await this.storage.deletePrefix(assetPrefix(spaceId, id));
      throw error;
    }
  }

  /** Name for folders; name and alt for files (empty alt removes it). */
  async update(spaceId: string, id: string, input: { name?: string; alt?: string }): Promise<Asset> {
    return toAsset(found(await this.assets.update(spaceId, id, input)));
  }

  /** Files only: a folder's descendants carry its path, so moving one would orphan them. */
  async move(spaceId: string, id: string, parentPath: string): Promise<Asset> {
    return toAsset(found(await this.assets.move(spaceId, id, parentPath)));
  }

  /** Deletes a file, or a folder with everything under it, rows and stored files alike. */
  async delete(spaceId: string, id: string): Promise<void> {
    const deleted = found(await this.assets.delete(spaceId, id));
    // After the commit: a failed delete must not leave rows pointing at missing files.
    for (const row of deleted) {
      if (row.kind === 'FILE') await this.storage.deletePrefix(assetPrefix(spaceId, row.id));
    }
  }
}
