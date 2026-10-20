import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { AssetTransferRepository } from '../repositories/asset-transfer.repository.js';
import { assetFileKey, PROGRESS_INTERVAL, type TaskOutcome } from '../utils/task.utils.js';
import { TaskLogService } from './task-log.service.js';

/**
 * ASSET_REGEN_METADATA: reads every file's metadata again. (ASSET_EXPORT and ASSET_IMPORT are switched off until their
 * redesign with the asset tree, docs/roadmap/content-asset-tree.md.)
 */
@Injectable()
export class AssetTransferService {
  constructor(
    private readonly assetTransferRepository: AssetTransferRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly assetMetadataService: AssetMetadataService,
    private readonly taskLogService: TaskLogService,
  ) {}

  async regenerateMetadata(task: TaskEntity): Promise<TaskOutcome> {
    const files = await this.assetTransferRepository.findFiles(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `found ${files.length} assets to regenerate`);
    let count = 0;
    for (const file of files) {
      const key = assetFileKey(task.spaceId, file.id);
      if (!(await this.storage.stat(key))) {
        await this.taskLogService.log(task, 'WARN', `asset ${file.id} has no file`);
        continue;
      }
      const extracted = await this.assetMetadataService.extract(key, file.type ?? '', file.alt);
      await this.assetTransferRepository.updateMetadata(task.spaceId, file.id, extracted);
      if (++count % PROGRESS_INTERVAL === 0) await this.taskLogService.log(task, 'INFO', `regenerated ${count}/${files.length}`);
    }
    await this.assetTransferRepository.metadataRefreshed(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `total regenerated : ${count}`);
    return { status: 'FINISHED' };
  }
}
