import type { Readable } from 'node:stream';
import { Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import type { Page, Task, TaskLog } from '@localess/shared';
import type { UserRow } from '../../../shared/models/user.js';
import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import { toTask, toTaskLog } from '../../../shared/transformers/task.transformer.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import type { TaskPageable } from '../models/task.models.js';
import { type TaskEntity, TaskRepository } from '../repositories/task.repository.js';
import { assertCanManage } from '../utils/task-permissions.js';
import { toPage } from '../../../shared/utils/paging.js';
import { taskFileKey, taskFilesPrefix } from '../utils/task.utils.js';

/** An export or metadata regeneration, as the client asks for it. */
export type ExportTaskInput =
  | { kind: 'ASSET_EXPORT' | 'CONTENT_EXPORT'; path?: string }
  | { kind: 'SCHEMA_EXPORT' | 'ASSET_REGEN_METADATA' }
  | { kind: 'TRANSLATION_EXPORT'; locale?: string };

/** An uploaded import file; `stream.truncated` is set when it went over the upload limit. */
export interface ImportUpload {
  kind: 'ASSET_IMPORT' | 'CONTENT_IMPORT' | 'SCHEMA_IMPORT' | 'TRANSLATION_IMPORT';
  /** Translation import of one locale from a flat JSON file. */
  locale?: string;
  filename: string;
  stream: Readable & { truncated?: boolean };
}

/** A task's file, ready to stream. */
export interface TaskDownload {
  filename: string;
  size: number;
  stream: Readable;
}

/**
 * Export/import tasks (was `spaces/{s}/tasks`, created by the browser and run by `task-oncreate`).
 * Rows are created INITIATED; the task worker picks them up.
 */
@Injectable()
export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly spaces: SpaceRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  async findAll(spaceId: string, query: TaskPageable): Promise<Page<Task>> {
    const { rows, total } = await this.tasks.findPage(spaceId, query);
    return toPage(rows, total, query, toTask);
  }

  async findOne(spaceId: string, id: string): Promise<Task> {
    return toTask(await this.find(spaceId, id));
  }

  async findLogs(spaceId: string, id: string): Promise<TaskLog[]> {
    await this.find(spaceId, id);
    return (await this.tasks.findLogs(id)).map(toTaskLog);
  }

  /** The task's file (export result or uploaded import). */
  async download(spaceId: string, id: string): Promise<TaskDownload> {
    const task = await this.find(spaceId, id);
    const key = taskFileKey({ spaceId, id });
    const stat = await this.storage.stat(key);
    if (!stat) throw new NotFoundException('This task has no file');
    const filename = task.file?.name ?? `${task.kind.toLowerCase()}-${id}`;
    return { filename, size: stat.size, stream: this.storage.createReadStream(key) };
  }

  /** Exports and metadata regeneration. */
  async create(spaceId: string, input: ExportTaskInput, user: UserRow): Promise<Task> {
    assertCanManage(user, input.kind);
    return toTask(await this.tasks.create(spaceId, { id: newUuid(), ...input }));
  }

  /**
   * Imports: the upload is stored as the task's original, then the task created. Its files are dropped again when
   * that fails. The caller checked `assertCanManage` (it must drain the upload when that fails).
   */
  async createImport(spaceId: string, upload: ImportUpload): Promise<Task> {
    await this.spaces.require(spaceId);
    const id = newUuid();
    try {
      const stored = await this.storage.put(taskFileKey({ spaceId, id }), upload.stream);
      if (upload.stream.truncated) throw new PayloadTooLargeException('File is too large');
      const translation = upload.kind === 'TRANSLATION_IMPORT';
      return toTask(
        await this.tasks.create(spaceId, {
          id,
          kind: upload.kind,
          file: { name: upload.filename, size: stored.size },
          ...(translation ? { type: upload.locale ? 'flat-json' : 'full', locale: upload.locale ?? null } : {}),
        }),
      );
    } catch (error) {
      await this.storage.deletePrefix(taskFilesPrefix(spaceId, id));
      throw error;
    }
  }

  /** Logs cascade; the task's files go too. */
  async remove(spaceId: string, id: string, user: UserRow): Promise<void> {
    const task = await this.find(spaceId, id);
    assertCanManage(user, task.kind);
    await this.tasks.delete(spaceId, id);
    await this.storage.deletePrefix(taskFilesPrefix(spaceId, id));
  }

  private async find(spaceId: string, id: string): Promise<TaskEntity> {
    const task = await this.tasks.findById(spaceId, id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
