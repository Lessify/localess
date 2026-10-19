import type { Readable } from 'node:stream';
import { BadRequestException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { Asset, AssetFolderSummary } from '@localess/shared';
import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { StorageSweeperService } from '../../../shared/services/storage-sweeper.service.js';
import { toAsset } from '../../../shared/transformers/asset.transformer.js';
import { toDto } from '../../../shared/transformers/dto.transformer.js';
import { type AssetQuery, AssetsRepository } from '../repositories/assets.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { splitFilename } from '../utils/split-filename.js';
import { assetPrefix, originalKey } from '../utils/storage-keys.js';

export interface UploadInput {
  /** The folder; null: the root. */
  parentId: string | null;
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
    private readonly sweeper: StorageSweeperService,
  ) {}

  async findAll(spaceId: string, query: AssetQuery): Promise<Asset[]> {
    return (await this.assets.findAll(spaceId, query)).map(toAsset);
  }

  count(spaceId: string, kind?: 'FOLDER' | 'FILE'): Promise<number> {
    return this.assets.count(spaceId, kind);
  }

  async findOne(spaceId: string, id: string): Promise<Asset> {
    return toAsset(found(await this.assets.findById(spaceId, id)));
  }

  /** Every folder of the space: the editor builds its breadcrumbs and move targets from them. */
  async findFolders(spaceId: string): Promise<AssetFolderSummary[]> {
    return (await this.assets.findFolders(spaceId)).map(it => toDto(it) as unknown as AssetFolderSummary);
  }

  async createFolder(spaceId: string, parentId: string | null, name: string): Promise<Asset> {
    const row = await this.assets.createFolder(spaceId, parentId, name);
    if (!row) throw new BadRequestException('No such folder');
    return toAsset(row);
  }

  /**
   * Streams the file into storage, reads its metadata, then creates the row — so there is never a
   * row without its file: the response is the stored asset (the Firebase flow created the row first and let a
   * trigger finish it).
   */
  async upload(spaceId: string, input: UploadInput): Promise<Asset> {
    if (!(await this.spaces.find(spaceId))) throw new NotFoundException('Space not found');
    if (!(await this.assets.isFolder(spaceId, input.parentId))) throw new BadRequestException('No such folder');
    // Every file has a name, a type and an extension ('' when its name has none).
    const derived = splitFilename(input.filename);
    const name = input.name || derived.name;
    if (!name) {
      input.file.resume();
      throw new BadRequestException('The file needs a name');
    }
    const id = newUuid();
    const key = originalKey(spaceId, id);
    // If this request dies before the row exists, the guard lets the sweeper remove the file in an hour.
    await this.assets.guardUpload(spaceId, id);
    try {
      const stored = await this.storage.put(key, input.file);
      // @fastify/multipart ends a piped stream at the size limit rather than erroring, so a cut-off
      // file would otherwise be stored as if it were complete.
      if (input.truncated?.()) throw new PayloadTooLargeException('File is too large');
      const type = input.mimetype || 'application/octet-stream';
      const extracted = await this.metadata.extract(key, type, input.alt);
      const row = await this.assets.createFile(spaceId, {
        id,
        name,
        extension: input.extension ?? derived.extension,
        type,
        size: stored.size,
        md5: stored.md5,
        parentId: input.parentId,
        alt: input.alt || extracted.alt || null,
        source: input.source || null,
        metadata: extracted.metadata ?? null,
      });
      // Its folder went since the check: the file is removed below, as for any failed upload.
      if (!row) throw new BadRequestException('No such folder');
      return toAsset(row);
    } catch (error) {
      // Cleaned up at once when storage allows; otherwise the guard stays and the sweeper does it.
      const cleaned = await this.storage.deletePrefix(assetPrefix(spaceId, id)).then(
        () => true,
        () => false,
      );
      if (cleaned) await this.assets.releaseUploadGuard(spaceId, id);
      throw error;
    }
  }

  /** Name for folders; name and alt for files (empty alt removes it). */
  async update(spaceId: string, id: string, input: { name?: string; alt?: string }): Promise<Asset> {
    return toAsset(found(await this.assets.update(spaceId, id, input)));
  }

  /**
   * How many contents use the file, or any file under the folder: shown before a delete, which leaves those contents
   * pointing at a missing asset.
   */
  async findUsage(spaceId: string, id: string): Promise<{ contents: number }> {
    const files = found(await this.assets.findFileIdsWithin(spaceId, id));
    return { contents: await this.assets.countContentsUsing(spaceId, files) };
  }

  /** A file or a folder (with everything under it) into folder `parentId`; null: the root. */
  async move(spaceId: string, id: string, parentId: string | null): Promise<Asset> {
    const result = found(await this.assets.move(spaceId, id, parentId));
    if ('noParent' in result) throw new BadRequestException('No such folder');
    if ('intoItself' in result) throw new BadRequestException('A folder cannot be moved into itself');
    return toAsset(result.asset);
  }

  /**
   * Deletes a file, or a folder with everything under it. The rows go in the transaction, which queues their stored
   * files; the sweeper deletes those right after the commit (and retries if storage fails), so a row never points at a
   * missing file and no file is left without a row.
   */
  async remove(spaceId: string, id: string): Promise<void> {
    found(await this.assets.delete(spaceId, id));
    this.sweeper.kick();
  }
}
