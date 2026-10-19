import { Injectable } from '@nestjs/common';
import { AssetTransferService } from '../services/asset-transfer.service.js';
import { SchemaTransferService } from '../services/schema-transfer.service.js';
import { TranslationTransferService } from '../services/translation-transfer.service.js';
import type { TaskOutcome } from '../utils/task.utils.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';

/**
 * The export/import jobs, ported from functions/src/tasks.ts with the same archive layouts and file
 * names. Exports stream the archive straight into storage; imports read only the entries they expect
 * from the stored archive (no extraction to disk), each capped in size. Each kind's job lives in its
 * transfer service; this dispatches by kind.
 */
@Injectable()
export class TaskRunner {
  constructor(
    private readonly assetTransferService: AssetTransferService,
    private readonly schemaTransferService: SchemaTransferService,
    private readonly translationTransferService: TranslationTransferService,
  ) {}

  async run(task: TaskEntity): Promise<TaskOutcome> {
    switch (task.kind) {
      case 'ASSET_EXPORT':
      case 'ASSET_IMPORT':
        // Redesigned with the asset tree (docs/roadmap/content-asset-tree.md); switched off until then.
        return { status: 'ERROR', message: 'Asset import and export are being redesigned' };
      case 'ASSET_REGEN_METADATA':
        return this.assetTransferService.regenerateMetadata(task);
      case 'CONTENT_EXPORT':
      case 'CONTENT_IMPORT':
        // Redesigned with the content tree (docs/roadmap/content-asset-tree.md); switched off until then.
        return { status: 'ERROR', message: 'Content import and export are being redesigned' };
      case 'SCHEMA_EXPORT':
        return this.schemaTransferService.export(task);
      case 'SCHEMA_IMPORT':
        return this.schemaTransferService.import(task);
      case 'TRANSLATION_EXPORT':
        return task.locale ? this.translationTransferService.exportFlat(task) : this.translationTransferService.export(task);
      case 'TRANSLATION_IMPORT':
        return task.locale ? this.translationTransferService.importFlat(task) : this.translationTransferService.import(task);
      default:
        return { status: 'ERROR', message: `Unknown task kind '${task.kind}'` };
    }
  }
}
