import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { AssetMetadataService } from '../../../shared/services/asset-metadata.service.js';
import { AssetTransferRepository } from '../repositories/asset-transfer.repository.js';
import { assetFileKey, formatCounts, type TaskOutcome } from '../utils/task.utils.js';
import type { TaskProgressReporter } from '../utils/task-progress.js';
import { TaskLogService } from './task-log.service.js';

/** ASSET_REGEN_METADATA: reads every file's metadata again (assets move with the full export, not as tasks of their own). */
@Injectable()
export class AssetTransferService {
  constructor(
    private readonly assetTransferRepository: AssetTransferRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly assetMetadataService: AssetMetadataService,
    private readonly taskLogService: TaskLogService,
  ) {}

  /** Result: `updated` the files read again, `skipped` those whose file is missing. */
  async regenerateMetadata(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    const files = await this.assetTransferRepository.findFiles(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `found ${files.length} assets to regenerate`);
    let updated = 0;
    let skipped = 0;
    for (const [index, file] of files.entries()) {
      await progress.report('Regenerating', index, files.length);
      const key = assetFileKey(task.spaceId, file.id);
      if (!(await this.storage.stat(key))) {
        await this.taskLogService.log(task, 'WARN', `asset ${file.id} has no file`);
        skipped++;
        continue;
      }
      const extracted = await this.assetMetadataService.extract(key, file.type ?? '', file.alt);
      await this.assetTransferRepository.updateMetadata(task.spaceId, file.id, extracted);
      updated++;
    }
    await progress.report('Regenerating', files.length, files.length);
    await progress.flush();
    await this.assetTransferRepository.metadataRefreshed(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `total regenerated : ${updated}`);
    await this.taskLogService.log(task, 'INFO', formatCounts({ created: 0, updated, unchanged: 0, skipped }));
    return { status: 'FINISHED' };
  }
}
