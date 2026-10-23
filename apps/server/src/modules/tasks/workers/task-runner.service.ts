import { Injectable } from '@nestjs/common';

import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { AssetTransferService } from '../services/asset-transfer.service.js';
import { SchemaTransferService } from '../services/schema-transfer.service.js';
import { TaskLogService } from '../services/task-log.service.js';
import { TranslationTransferService } from '../services/translation-transfer.service.js';
import { TranslationTranslateService } from '../services/translation-translate.service.js';
import type { TaskOutcome } from '../utils/task.utils.js';
import type { TaskProgressReporter } from '../utils/task-progress.js';

/**
 * Dispatches a task to its kind's job (each in its service). A job answers FINISHED or ERROR (and an export its file);
 * everything else it has to say, it logs.
 */
@Injectable()
export class TaskRunner {
  constructor(
    private readonly assetTransferService: AssetTransferService,
    private readonly schemaTransferService: SchemaTransferService,
    private readonly translationTransferService: TranslationTransferService,
    private readonly translationTranslateService: TranslationTranslateService,
    private readonly taskLogService: TaskLogService,
  ) {}

  async run(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    switch (task.kind) {
      case 'ASSET_REGEN_METADATA':
        return this.assetTransferService.regenerateMetadata(task, progress);
      case 'SCHEMA_EXPORT':
        return this.schemaTransferService.export(task, progress);
      case 'SCHEMA_IMPORT':
        return this.schemaTransferService.import(task, progress);
      case 'TRANSLATION_EXPORT':
        return this.translationTransferService.export(task, progress);
      case 'TRANSLATION_IMPORT':
        return task.params?.type === 'translation-json-flat'
          ? this.translationTransferService.importLocale(task, progress)
          : this.translationTransferService.import(task, progress);
      case 'TRANSLATION_TRANSLATE':
        return this.translationTranslateService.translate(task, progress);
      default: {
        // Every kind is handled above (a new one fails to compile here); a row written by a newer build still answers.
        const kind: never = task.kind;
        await this.taskLogService.log(task, 'ERROR', `Unknown task kind '${String(kind)}'`);
        return { status: 'ERROR' };
      }
    }
  }
}
