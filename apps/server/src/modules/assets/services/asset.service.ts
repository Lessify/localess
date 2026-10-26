import type { Readable } from 'node:stream';

import type { Asset, AssetFileSummary, AssetFolderSummary, AssetPageable, AssetUpdate, Page } from '@localess/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';

import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { AssetEntity } from '../../../shared/entities/asset.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { StorageSweeperService } from '../../../shared/services/storage-sweeper.service.js';
import { toAsset, toAssetFileSummary, toAssetFolderSummary } from '../../../shared/transformers/asset.transformer.js';
import { toOriginalName } from '../../../shared/utils/asset-files.js';
import { errorMessage } from '../../../shared/utils/error-message.js';
import { toPage } from '../../../shared/utils/paging.js';
import { AssetRepository } from '../repositories/asset.repository.js';
import { assetErrors } from '../utils/asset-errors.js';
import { splitFilename } from '../utils/split-filename.js';
import { assetPrefix, originalKey } from '../utils/storage-keys.js';
import { AssetDeliveryService } from './asset-delivery.service.js';

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
 * the upload/delete triggers). Files are stored under `spaces/{s}/assets/{id}/{original_name}`.
 */
@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly spaceLookupRepository: SpaceLookupRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly assetMetadataService: AssetMetadataService,
    private readonly storageSweeperService: StorageSweeperService,
    private readonly assetDeliveryService: AssetDeliveryService,
  ) {}

  /** One page of the list, folders first. */
  async findAll(spaceId: string, query: AssetPageable): Promise<Page<Asset>> {
    await this.requireSpace(spaceId);
    const [rows, total] = await Promise.all([
      this.assetRepository.findAll(spaceId, query),
      this.assetRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toAsset);
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'FILE'): Promise<number> {
    await this.requireSpace(spaceId);
    return this.assetRepository.count(spaceId, kind);
  }

  async findOne(spaceId: string, assetId: string): Promise<Asset> {
    return toAsset(await this.requireAsset(spaceId, assetId));
  }

  /** Every folder of the space: the editor builds its breadcrumbs and move targets from them. */
  async findFolders(spaceId: string): Promise<AssetFolderSummary[]> {
    await this.requireSpace(spaceId);
    return (await this.assetRepository.findFolders(spaceId)).map(toAssetFolderSummary);
  }

  /** Every file of the space, light: the editor's Asset and Assets fields show theirs from it. */
  async findFiles(spaceId: string): Promise<AssetFileSummary[]> {
    await this.requireSpace(spaceId);
    return (await this.assetRepository.findFiles(spaceId)).map(toAssetFileSummary);
  }

  async createFolder(spaceId: string, parentId: string | null, name: string): Promise<Asset> {
    await this.requireSpace(spaceId);
    await this.requireFolder(spaceId, parentId);
    return this.findAsset(spaceId, await this.assetRepository.createFolder(spaceId, parentId, name));
  }

  /**
   * Streams the file into storage, reads its metadata, then creates the row — so there is never a
   * row without its file: the response is the stored asset (the Firebase flow created the row first and let a
   * trigger finish it).
   */
  async upload(spaceId: string, input: UploadInput): Promise<Asset> {
    try {
      await this.requireSpace(spaceId);
      await this.requireFolder(spaceId, input.parentId);
    } catch (error) {
      // Refused before storing: the rest of the file is read and dropped, so the request ends.
      input.file.resume();
      throw error;
    }
    // Every file has a name, a type and an extension ('' when its name has none).
    const derived = splitFilename(input.filename);
    const name = input.name || derived.name;
    if (!name) {
      input.file.resume();
      throw new BadRequestException(assetErrors.noName);
    }
    const id = newUuid();
    // The upload's file name, as sent: storage shows what the file is whatever the asset is named or renamed to later.
    const originalName = toOriginalName(input.filename);
    const key = originalKey(spaceId, id, originalName);
    // If this request dies before the row exists, the guard lets the sweeper remove the file in an hour.
    await this.assetRepository.guardUpload(spaceId, id);
    try {
      const stored = await this.storage.put(key, input.file);
      // @fastify/multipart ends a piped stream at the size limit rather than erroring, so a cut-off
      // file would otherwise be stored as if it were complete.
      if (input.truncated?.()) throw new PayloadTooLargeException('File is too large');
      const type = input.mimetype || 'application/octet-stream';
      const extracted = await this.assetMetadataService.extract(key, type, input.alt);
      await this.assetRepository.createFile(spaceId, {
        id,
        name,
        originalName,
        extension: input.extension ?? derived.extension,
        type,
        size: stored.size,
        md5: stored.md5,
        parentId: input.parentId,
        alt: input.alt || extracted.alt || null,
        source: input.source || null,
        metadata: extracted.metadata ?? null,
      });
      // Its folder went since the check: createFile throws, and the file is removed below, as for any failed upload.
      const asset = await this.findAsset(spaceId, id);
      this.assetDeliveryService.warmThumbnail(spaceId, id);
      return asset;
    } catch (error) {
      // Cleaned up at once when storage allows; otherwise the guard stays and the sweeper does it.
      const cleaned = await this.storage.deletePrefix(assetPrefix(spaceId, id)).then(
        () => true,
        () => false,
      );
      if (cleaned) await this.assetRepository.releaseUploadGuard(spaceId, id);
      // The browser only sees the answer, if any: a cut request (a closed tab, a restart) leaves nothing else behind.
      this.logger.warn(
        `Upload of '${originalName}' failed (space ${spaceId}, asset ${id}): ${errorMessage(error)}; ` +
          (cleaned ? 'its file was removed' : 'its file is left to the storage sweeper'),
      );
      throw error;
    }
  }

  /**
   * The file of a file asset that has none (imported from Firebase without it: too large, or missing there), stored
   * under the same id so every reference to it works. An asset's bytes never change otherwise: one that has its file
   * answers 409. Name, folder and alt stay; type, extension, size and metadata come from the upload.
   */
  async uploadMissingFile(
    spaceId: string,
    assetId: string,
    input: Omit<UploadInput, 'parentId' | 'name' | 'extension' | 'alt' | 'source'>,
  ): Promise<Asset> {
    let current: AssetEntity;
    try {
      current = await this.requireAsset(spaceId, assetId);
      if (current.kind !== 'FILE' || current.md5) throw new ConflictException(assetErrors.notMissingFile);
    } catch (error) {
      // Refused before storing: the rest of the file is read and dropped, so the request ends.
      input.file.resume();
      throw error;
    }
    const originalName = toOriginalName(input.filename);
    const key = originalKey(spaceId, assetId, originalName);
    try {
      const stored = await this.storage.put(key, input.file);
      if (input.truncated?.()) throw new PayloadTooLargeException('File is too large');
      const type = input.mimetype || current.type || 'application/octet-stream';
      const extracted = await this.assetMetadataService.extract(key, type, current.alt ?? undefined);
      const outcome = await this.assetRepository.setMissingFile(spaceId, assetId, {
        originalName,
        extension: splitFilename(input.filename).extension || current.extension || '',
        type,
        size: stored.size,
        md5: stored.md5,
        alt: current.alt ?? extracted.alt ?? null,
        metadata: extracted.metadata ?? null,
      });
      if (outcome === 'gone') throw new NotFoundException('Asset not found');
      if (outcome === 'hasFile') throw new ConflictException(assetErrors.notMissingFile);
      const asset = await this.findAsset(spaceId, assetId);
      this.assetDeliveryService.warmThumbnail(spaceId, assetId);
      return asset;
    } catch (error) {
      // Only this upload's file goes; another upload that filled the asset meanwhile under the same name keeps its own.
      const now = await this.assetRepository.findOne(spaceId, assetId);
      if (!(now?.md5 && now.originalName === originalName)) await this.storage.delete(key).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Name for folders; name and alt for files (empty alt removes it); and/or a move into folder `parentId` (null: the
   * root), a folder with everything under it. One write: the target and "not into itself" are checked again under the
   * assets lock.
   */
  async update(spaceId: string, assetId: string, input: AssetUpdate): Promise<Asset> {
    const current = await this.requireAsset(spaceId, assetId);
    if (current.kind !== 'FILE' && input.alt !== undefined) throw new BadRequestException(assetErrors.altOnFolder);
    if (input.parentId !== undefined) await this.requireFolder(spaceId, input.parentId);
    await this.assetRepository.update(spaceId, assetId, input);
    return this.findAsset(spaceId, assetId);
  }

  /**
   * How many contents use the file, or any file under the folder: shown before a delete, which leaves those contents
   * pointing at a missing asset.
   */
  async findUsage(spaceId: string, assetId: string): Promise<{ contents: number }> {
    await this.requireAsset(spaceId, assetId);
    const files = found(await this.assetRepository.findFileIdsWithin(spaceId, assetId));
    return { contents: await this.assetRepository.countContentsUsing(spaceId, files) };
  }

  /**
   * Deletes a file, or a folder with everything under it. The rows go in the transaction, which queues their stored
   * files; the sweeper deletes those right after the commit (and retries if storage fails), so a row never points at a
   * missing file and no file is left without a row.
   */
  async remove(spaceId: string, assetId: string): Promise<void> {
    await this.requireAsset(spaceId, assetId);
    if ((await this.assetRepository.delete(spaceId, assetId)).length) this.storageSweeperService.kick();
  }

  /** Every route checks its space first (404 "Space not found"), then the asset (404 "Asset not found"). */
  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }

  /** The space first, then its asset (404 "Asset not found", also for an asset of another space). */
  private async requireAsset(spaceId: string, assetId: string): Promise<AssetEntity> {
    await this.requireSpace(spaceId);
    return found(await this.assetRepository.findOne(spaceId, assetId));
  }

  /** `parentId` is null (the root) or a folder of the space (400 "No such folder"). */
  private async requireFolder(spaceId: string, parentId: string | null): Promise<void> {
    if (!(await this.assetRepository.isFolder(spaceId, parentId))) throw new BadRequestException(assetErrors.noFolder);
  }

  /** The asset as stored after a write (404 when it went meanwhile). */
  private async findAsset(spaceId: string, assetId: string): Promise<Asset> {
    return toAsset(found(await this.assetRepository.findOne(spaceId, assetId)));
  }
}
