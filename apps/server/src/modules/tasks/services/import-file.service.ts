import { Inject, Injectable } from '@nestjs/common';
import type { ZodError } from 'zod';
import type { TaskExportMetadata } from '@localess/shared';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../repositories/task.repository.js';
import { formatZodError, KIND_LABEL, taskFileKey, type TaskOutcome } from '../utils/task.utils.js';
import { openZip, type ZipReader } from '../utils/zip.js';
import { TaskLogService } from './task-log.service.js';

/** What every import does with its uploaded archive: open it, check it is the right kind, report invalid data. */
@Injectable()
export class ImportFileService {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly log: TaskLogService,
  ) {}

  /** Opens the archive and checks its metadata; returns an ERROR outcome when it's the wrong kind of file. */
  async open(task: TaskEntity, kind: TaskExportMetadata['kind']): Promise<{ zip: ZipReader } | TaskOutcome> {
    await this.log.log(task, 'INFO', 'reading archive');
    let zip: ZipReader;
    try {
      zip = await openZip(this.storage, taskFileKey(task));
    } catch {
      return { status: 'ERROR', message: `It is not a ${KIND_LABEL[kind]} Export file.` };
    }
    const metadata = await zip.readJson<TaskExportMetadata>('metadata.json', 64 * 1024).catch(() => undefined);
    if (metadata?.kind !== kind) return { status: 'ERROR', message: `It is not a ${KIND_LABEL[kind]} Export file.` };
    return { zip };
  }

  async invalid(task: TaskEntity, kind: TaskExportMetadata['kind'], error: ZodError): Promise<TaskOutcome> {
    await this.log.log(task, 'WARN', formatZodError(error));
    return { status: 'ERROR', message: `${KIND_LABEL[kind]} data is invalid.`, trace: JSON.stringify(error.issues.slice(0, 100)) };
  }
}
