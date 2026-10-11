import { Inject, Injectable } from '@nestjs/common';
import { Asset, AssetExport, TaskExportMetadata } from '@localess/shared';
import { zAssetExportArraySchema } from '@localess/shared/zod';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { withoutNulls } from '../../../infra/database/without-nulls.js';
import { isValidId } from '../../../infra/http/v1/id-param.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { assetToExport } from '../../../shared/transformers/transfer.transformer.js';
import { folderPath } from '../../../shared/utils/asset-path.utils.js';
import { type AssetEntity, type AssetImportWrite, AssetTransferRepository } from '../repositories/asset-transfer.repository.js';
import type { TaskEntity } from '../repositories/tasks.repository.js';
import { isAssetChanged } from '../utils/import-diff.js';
import { assetFileKey, MAX_JSON_BYTES, PROGRESS_INTERVAL, taskFileKey, type TaskOutcome } from '../utils/task.utils.js';
import { writeZip } from '../utils/zip.js';
import { ImportFileService } from './import-file.service.js';
import { TaskLogService } from './task-log.service.js';

/** ASSET_EXPORT, ASSET_IMPORT and ASSET_REGEN_METADATA: assets with their files. */
@Injectable()
export class AssetTransferService {
  constructor(
    private readonly assets: AssetTransferRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly metadata: AssetMetadataService,
    private readonly importFile: ImportFileService,
    private readonly log: TaskLogService,
  ) {}

  async export(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    let rows: AssetEntity[] = [];
    if (task.path) {
      // One asset or folder (by id), its whole subtree, and the folders on the way to it.
      const root = await this.assets.findById(spaceId, task.path);
      if (root) {
        rows.push(root);
        await this.log.log(task, 'INFO', `root id=${root.id} name=${root.name}`);
        if (root.kind === 'FOLDER') rows.push(...(await this.assets.findDescendants(spaceId, folderPath(root))));
        if (root.parentPath) rows.push(...(await this.assets.findByIds(spaceId, root.parentPath.split('/'))));
      }
    } else {
      rows = await this.assets.findAll(spaceId);
    }
    await this.log.log(task, 'INFO', `exporting ${rows.length} assets`);
    const metadata: TaskExportMetadata = { kind: 'ASSET', ...(task.path ? { path: task.path } : {}) };
    const files = rows.filter(row => row.kind === 'FILE');
    const present: typeof files = [];
    for (const file of files) {
      if (await this.storage.stat(assetFileKey(spaceId, file.id))) present.push(file);
      else await this.log.log(task, 'WARN', `file of asset ${file.id} is missing, exported without it`);
    }
    await this.log.log(task, 'INFO', `archiving ${present.length} files`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'assets.json', content: JSON.stringify(rows.map(assetToExport)) },
      { name: 'metadata.json', content: JSON.stringify(metadata) },
      ...present.map(file => ({ name: `assets/${file.id}`, content: () => this.storage.createReadStream(assetFileKey(spaceId, file.id)) })),
    ]);
    await this.log.log(task, 'INFO', 'archive saved');
    return { status: 'FINISHED', file: { name: `asset-export-${task.id}.lla.zip`, size } };
  }

  async import(task: TaskEntity): Promise<TaskOutcome> {
    const { spaceId } = task;
    const opened = await this.importFile.open(task, 'ASSET');
    if (!('zip' in opened)) return opened;
    const raw = await opened.zip.readJson('assets.json', MAX_JSON_BYTES);
    const parse = zAssetExportArraySchema.safeParse(raw);
    if (!parse.success) return this.importFile.invalid(task, 'ASSET', parse.error);
    // Validated, but the raw items are imported (as before): the schemas strip keys they don't list.
    const entries = raw as AssetExport[];
    // Ids end up in storage keys.
    const badId = entries.find(it => !isValidId(it.id));
    if (badId) return { status: 'ERROR', message: 'Asset data is invalid.', trace: `Invalid asset id '${badId.id}'` };
    await this.log.log(task, 'INFO', `valid=${entries.length}`);

    const rows = await this.assets.findAll(spaceId);
    const existing = new Map(rows.map(row => [row.id, withoutNulls(row) as unknown as Asset]));
    // Exports from the Firebase era carry Firestore ids: each becomes a UUID, kept as `legacy_id` (so content that
    // references the old id still finds it, and a re-import reuses the same UUID), and parent paths follow.
    const legacy = new Map(rows.filter(row => row.legacyId).map(row => [row.legacyId as string, row.id]));
    const ids = new Map(entries.map(it => [it.id, isUuid(it.id) ? it.id : (legacy.get(it.id) ?? newUuid())]));
    const mapPath = (path: string) =>
      path
        ? path
            .split('/')
            .map(segment => ids.get(segment) ?? legacy.get(segment) ?? segment)
            .join('/')
        : path;
    const legacyIds = new Map(entries.map(it => [ids.get(it.id) as string, isUuid(it.id) ? null : it.id]));
    // The id each entry has in the file, for reading its bytes from the archive.
    const fileIds = new Map(entries.map(it => [ids.get(it.id) as string, it.id]));
    const imported = entries.map(it => ({ ...it, id: ids.get(it.id) as string, parentPath: mapPath(it.parentPath) }) as AssetExport);
    // Store new files first, so rows never point at missing files; undo them if the rows fail.
    const storedFiles = new Map<string, { size: number; md5: string; metadata?: Record<string, unknown>; alt?: string }>();
    try {
      let streamed = 0;
      for (const asset of imported) {
        if (existing.has(asset.id) || asset.kind !== 'FILE') continue;
        const entry = opened.zip.open(`assets/${fileIds.get(asset.id)}`, this.config.uploadMaxBytes);
        if (!entry) continue; // as before: a file asset without its bytes is skipped
        // If the task dies before the rows are written, the guard lets the sweeper remove the file in an hour.
        await this.assets.guardUpload(spaceId, asset.id);
        const stored = await this.storage.put(assetFileKey(spaceId, asset.id), entry);
        const extracted = asset.metadata ? undefined : await this.metadata.extract(assetFileKey(spaceId, asset.id), asset.type, asset.alt);
        storedFiles.set(asset.id, { ...stored, metadata: extracted?.metadata, alt: extracted?.alt });
        if (++streamed % PROGRESS_INTERVAL === 0) await this.log.log(task, 'INFO', `stored ${streamed} files`);
      }
      const writes: AssetImportWrite[] = [];
      for (const asset of imported) {
        const current = existing.get(asset.id);
        const file = asset.kind === 'FILE' ? asset : undefined;
        if (current) {
          if (!isAssetChanged(current, asset)) continue;
          writes.push({
            op: 'update',
            id: asset.id,
            values: {
              name: asset.name,
              parentPath: asset.parentPath,
              ...(file
                ? {
                    extension: file.extension,
                    type: file.type,
                    size: file.size,
                    alt: file.alt || null,
                    source: file.source || null,
                    metadata: (file.metadata as Record<string, unknown>) ?? null,
                  }
                : {}),
            },
          });
        } else if (file) {
          const stored = storedFiles.get(asset.id);
          if (!stored) continue;
          writes.push({
            op: 'insert',
            values: {
              id: asset.id,
              legacyId: legacyIds.get(asset.id),
              kind: 'FILE',
              name: file.name,
              parentPath: file.parentPath,
              extension: file.extension,
              type: file.type,
              size: stored.size,
              md5: stored.md5,
              alt: file.alt || stored.alt || null,
              source: file.source || null,
              metadata: (file.metadata as Record<string, unknown>) ?? stored.metadata ?? null,
            },
          });
        } else {
          writes.push({
            op: 'insert',
            values: { id: asset.id, legacyId: legacyIds.get(asset.id), kind: 'FOLDER', name: asset.name, parentPath: asset.parentPath },
          });
        }
      }
      const changes = await this.assets.applyImport(spaceId, writes, [...storedFiles.keys()]);
      await this.log.log(task, 'INFO', `total changes : ${changes}`);
      return { status: 'FINISHED' };
    } catch (error) {
      // Cleaned up at once when storage allows; a file it can't remove keeps its guard, and the sweeper does it.
      const cleaned: string[] = [];
      for (const id of storedFiles.keys()) {
        await this.storage.deletePrefix(`spaces/${spaceId}/assets/${id}/`).then(
          () => cleaned.push(id),
          () => undefined,
        );
      }
      await this.assets.releaseUploadGuards(spaceId, cleaned);
      throw error;
    }
  }

  async regenerateMetadata(task: TaskEntity): Promise<TaskOutcome> {
    const files = await this.assets.findFiles(task.spaceId);
    await this.log.log(task, 'INFO', `found ${files.length} assets to regenerate`);
    let count = 0;
    for (const file of files) {
      const key = assetFileKey(task.spaceId, file.id);
      if (!(await this.storage.stat(key))) {
        await this.log.log(task, 'WARN', `asset ${file.id} has no file`);
        continue;
      }
      const extracted = await this.metadata.extract(key, file.type ?? '', file.alt);
      await this.assets.updateMetadata(task.spaceId, file.id, extracted);
      if (++count % PROGRESS_INTERVAL === 0) await this.log.log(task, 'INFO', `regenerated ${count}/${files.length}`);
    }
    await this.assets.metadataRefreshed(task.spaceId);
    await this.log.log(task, 'INFO', `total regenerated : ${count}`);
    return { status: 'FINISHED' };
  }
}
