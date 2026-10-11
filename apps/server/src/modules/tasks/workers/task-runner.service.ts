import { Injectable } from '@nestjs/common';
import type { TaskEntity } from '../repositories/tasks.repository.js';
import { AssetTransferService } from '../services/asset-transfer.service.js';
import { ContentTransferService } from '../services/content-transfer.service.js';
import { SchemaTransferService } from '../services/schema-transfer.service.js';
import { TranslationTransferService } from '../services/translation-transfer.service.js';
import type { TaskOutcome } from '../utils/task.utils.js';

/**
 * The export/import jobs, ported from functions/src/tasks.ts with the same archive layouts and file
 * names. Exports stream the archive straight into storage; imports read only the entries they expect
 * from the stored archive (no extraction to disk), each capped in size. Each kind's job lives in its
 * transfer service; this dispatches by kind.
 */
@Injectable()
export class TaskRunner {
  constructor(
    private readonly assets: AssetTransferService,
    private readonly contents: ContentTransferService,
    private readonly schemas: SchemaTransferService,
    private readonly translations: TranslationTransferService,
  ) {}

  async run(task: TaskEntity): Promise<TaskOutcome> {
    switch (task.kind) {
      case 'ASSET_EXPORT':
        return this.assets.export(task);
      case 'ASSET_IMPORT':
        return this.assets.import(task);
      case 'ASSET_REGEN_METADATA':
        return this.assets.regenerateMetadata(task);
      case 'CONTENT_EXPORT':
        return this.contents.export(task);
      case 'CONTENT_IMPORT':
        return this.contents.import(task);
      case 'SCHEMA_EXPORT':
        return this.schemas.export(task);
      case 'SCHEMA_IMPORT':
        return this.schemas.import(task);
      case 'TRANSLATION_EXPORT':
        return task.locale ? this.translations.exportFlat(task) : this.translations.export(task);
      case 'TRANSLATION_IMPORT':
        return task.locale ? this.translations.importFlat(task) : this.translations.import(task);
      default:
        return { status: 'ERROR', message: `Unknown task kind '${task.kind}'` };
    }
  }
}
