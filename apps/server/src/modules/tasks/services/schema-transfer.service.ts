import { Inject, Injectable } from '@nestjs/common';
import { TaskExportMetadata } from '@localess/shared';
import { zSchemaExportArraySchema } from '@localess/shared/zod';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { schemasByName, toSchema } from '../../../shared/transformers/schema.transformer.js';
import { docSchemaToExport, planSchemaPush } from '../../../shared/utils/schema.utils.js';
import { SchemaTransferRepository } from '../repositories/schema-transfer.repository.js';
import { MAX_JSON_BYTES, taskFileKey, type TaskOutcome } from '../utils/task.utils.js';
import { writeZip } from '../utils/zip.js';
import { ImportFileService } from './import-file.service.js';
import { TaskLogService } from './task-log.service.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';

/** SCHEMA_EXPORT and SCHEMA_IMPORT. */
@Injectable()
export class SchemaTransferService {
  constructor(
    private readonly schemaTransferRepository: SchemaTransferRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly importFileService: ImportFileService,
    private readonly taskLogService: TaskLogService,
  ) {}

  async export(task: TaskEntity): Promise<TaskOutcome> {
    const rows = await this.schemaTransferRepository.findAllByName(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `exporting all ${rows.length} schemas`);
    const size = await writeZip(this.storage, taskFileKey(task), [
      { name: 'schemas.json', content: JSON.stringify(rows.map(row => docSchemaToExport(row.name, toSchema(row)))) },
      { name: 'metadata.json', content: JSON.stringify({ kind: 'SCHEMA' } satisfies TaskExportMetadata) },
    ]);
    return { status: 'FINISHED', file: { name: `schema-export-${task.id}.lls.zip`, size } };
  }

  /**
   * Upsert: schemas absent from the file are kept. Fields that break a rule across fields (checked against the space's
   * schemas with the imported ones) fail the task, writing nothing.
   */
  async import(task: TaskEntity): Promise<TaskOutcome> {
    const opened = await this.importFileService.open(task, 'SCHEMA');
    if (!('zip' in opened)) return opened;
    const parse = zSchemaExportArraySchema.safeParse(await opened.zip.readJson('schemas.json', MAX_JSON_BYTES));
    if (!parse.success) return this.importFileService.invalid(task, 'SCHEMA', parse.error);
    await this.taskLogService.log(task, 'INFO', `valid=${parse.data.length}`);
    const rows = await this.schemaTransferRepository.findAll(task.spaceId);
    const plan = planSchemaPush(schemasByName(rows), parse.data, 'upsert');
    const errors = plan.errors.length ? plan.errors : await this.schemaTransferRepository.applyImport(task.spaceId, plan);
    if (errors.length) {
      for (const error of errors) await this.taskLogService.log(task, 'WARN', error);
      return { status: 'ERROR', message: 'Schema data is invalid.', trace: JSON.stringify(errors.slice(0, 100)) };
    }
    await this.taskLogService.log(task, 'INFO', `total changes : ${plan.creates.length + plan.updates.length}`);
    return { status: 'FINISHED' };
  }
}
