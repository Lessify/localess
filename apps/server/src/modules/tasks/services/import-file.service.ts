import type { LocalessFileKind } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';

import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import { type LocalessFile, LocalessFileError, openLocalessFile } from '../utils/localess-file.js';
import { taskFileKey, type TaskOutcome, type TaskProblem } from '../utils/task.utils.js';
import { TaskLogService } from './task-log.service.js';

/** The kind of export each file kind is, as a refused import names it. */
const EXPORT_NAME: Record<LocalessFileKind, string> = { TRANSLATION: 'Translations', SCHEMA: 'Schemas' };
/** Problem lines a refused import writes; the summary gives the total. */
const MAX_PROBLEM_LINES = 100;

/** What every import does with its uploaded file: open it, check it is the right kind, report why it is refused. */
@Injectable()
export class ImportFileService {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly taskLogService: TaskLogService,
  ) {}

  /** Opens the task's `.localess.zip` (or old archive); a failed task when it is not one, or of another kind. */
  async open(task: TaskEntity, kind: LocalessFileKind): Promise<LocalessFile | TaskOutcome> {
    await this.taskLogService.log(task, 'INFO', 'reading file');
    let file: LocalessFile;
    try {
      file = await openLocalessFile(this.storage, taskFileKey(task, task.file?.name ?? ''));
    } catch (error) {
      if (error instanceof LocalessFileError) return this.fail(task, error.message);
      throw error;
    }
    if (file.kind !== kind) return this.fail(task, `This is a ${EXPORT_NAME[file.kind]} export.`);
    return file;
  }

  /** A task that failed for `message`: an ERROR line in its logs (the task itself only says ERROR). */
  async fail(task: TaskEntity, message: string): Promise<TaskOutcome> {
    await this.taskLogService.log(task, 'ERROR', message);
    return { status: 'ERROR' };
  }

  /**
   * An import refused for the problems its file has, nothing written: a summary ERROR line and the first 100 problems as
   * WARN lines (`path: message`), in one insert.
   */
  async refused(task: TaskEntity, count: number, problems: TaskProblem[]): Promise<TaskOutcome> {
    const listed = problems.slice(0, MAX_PROBLEM_LINES);
    const summary =
      count > listed.length
        ? `The file has ${count.toLocaleString('en-US')} problems; the first ${listed.length} are listed.`
        : `The file has ${count} problem${count === 1 ? '' : 's'}.`;
    await this.taskLogService.logMany(task, [
      { level: 'ERROR', message: summary },
      ...listed.map(problem => ({ level: 'WARN' as const, message: `${problem.path}: ${problem.message}` })),
    ]);
    return { status: 'ERROR' };
  }
}
