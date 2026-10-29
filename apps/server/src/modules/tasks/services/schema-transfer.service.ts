import type { SchemaExport } from '@localess/shared';
import { zSchemaLine } from '@localess/shared/zod';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { schemasByName, toSchema } from '../../../shared/transformers/schema.transformer.js';
import { docSchemaToExport, planSchemaPush } from '../../../shared/utils/schema.utils.js';
import { SchemaTransferRepository } from '../repositories/schema-transfer.repository.js';
import { LINES_ENTRY, writeLocalessFile } from '../utils/localess-file.js';
import { exportFileName, formatCounts, taskFileKey, type TaskOutcome, type TaskProblem } from '../utils/task.utils.js';
import type { TaskProgressReporter } from '../utils/task-progress.js';
import { ImportFileService } from './import-file.service.js';
import { TaskLogService } from './task-log.service.js';

/** A cross-schema error of the push planner (`Schema 'page': …`) as a problem, at the schema it names. */
function toProblem(error: string): TaskProblem {
  const name = /^Schema '([^']+)'/.exec(error)?.[1];
  return { path: name ? `schemas.${name}` : 'schemas', message: error };
}

/**
 * SCHEMA_EXPORT and SCHEMA_IMPORT: a `.localess.zip` of schemas by name, without database ids (the relations between
 * schemas are names too, so they hold in any space). The planner and its rules are the CLI push's: a line becomes the
 * push's shape (the name as `id`) at this boundary.
 */
@Injectable()
export class SchemaTransferService {
  constructor(
    private readonly schemaTransferRepository: SchemaTransferRepository,
    private readonly spaceLookupRepository: SpaceLookupRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly importFileService: ImportFileService,
    private readonly taskLogService: TaskLogService,
  ) {}

  async export(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    const space = await this.spaceLookupRepository.findOne(task.spaceId);
    if (!space) throw new NotFoundException('Space not found');
    const rows = await this.schemaTransferRepository.findAllByName(task.spaceId);
    await this.taskLogService.log(task, 'INFO', `exporting all ${rows.length} schemas`);
    await progress.report('Writing', 0, rows.length);
    async function* lines(): AsyncIterable<object> {
      for (const row of rows) {
        const { id, ...schema } = docSchemaToExport(row.name, toSchema(row));
        yield { name: id, ...schema };
      }
    }
    const source = { spaceId: space.id, spaceName: space.name, locales: space.spaceLocales.map(it => it.localeId) };
    const name = exportFileName(space.name, 'schemas');
    const size = await writeLocalessFile(
      this.storage,
      taskFileKey(task, name),
      { kind: 'SCHEMA', source, count: rows.length },
      LINES_ENTRY.SCHEMA,
      lines(),
    );
    await progress.report('Writing', rows.length, rows.length);
    await progress.flush();
    return { status: 'FINISHED', file: { name, size } };
  }

  /**
   * Upsert by name: schemas absent from the file are kept. Every line is checked, then the whole set against the space's
   * schemas (the cross-schema rules); any problem refuses the import, writing nothing.
   */
  async import(task: TaskEntity, progress: TaskProgressReporter): Promise<TaskOutcome> {
    await progress.report('Reading file', 0);
    const opened = await this.importFileService.open(task, 'SCHEMA');
    if (!('lines' in opened)) return opened;
    const incoming: SchemaExport[] = [];
    const problems: TaskProblem[] = [];
    let problemCount = 0;
    const seen = new Set<string>();
    for await (const { index, value } of opened.lines()) {
      const line = zSchemaLine.safeParse(value);
      if (!line.success) {
        for (const issue of line.error.issues) {
          problemCount++;
          if (problems.length < 100)
            problems.push({ path: `schemas[${index}]${issue.path.map(it => `.${String(it)}`).join('')}`, message: issue.message });
        }
        continue;
      }
      const { name, ...schema } = line.data;
      if (seen.has(name)) {
        problemCount++;
        if (problems.length < 100) problems.push({ path: `schemas[${index}].name`, message: 'duplicate name' });
        continue;
      }
      seen.add(name);
      incoming.push({ id: name, ...schema });
    }
    if (problemCount) return this.importFileService.refused(task, problemCount, problems);
    await progress.report('Checking', 0, incoming.length);
    const rows = await this.schemaTransferRepository.findAll(task.spaceId);
    const plan = planSchemaPush(schemasByName(rows), incoming, 'upsert');
    if (plan.errors.length) return this.importFileService.refused(task, plan.errors.length, plan.errors.map(toProblem));
    await progress.report('Writing', 0, incoming.length);
    const lost = await this.schemaTransferRepository.applyImport(task.spaceId, plan);
    if (lost.length) return this.importFileService.refused(task, lost.length, lost.map(toProblem));
    await progress.report('Writing', incoming.length, incoming.length);
    await progress.flush();
    await this.taskLogService.log(
      task,
      'INFO',
      formatCounts({ created: plan.creates.length, updated: plan.updates.length, unchanged: plan.unchanged.length, skipped: 0 }),
    );
    return { status: 'FINISHED' };
  }
}
