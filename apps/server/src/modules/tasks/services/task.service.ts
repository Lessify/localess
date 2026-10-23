import type { Readable } from 'node:stream';

import { type Page, type Task, type TaskCreate, type TaskImportCreate, TaskKind, type TaskPageable } from '@localess/shared';
import { Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';

import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskEntity } from '../../../shared/entities/task.entity.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { toTask } from '../../../shared/transformers/task.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { taskFileKey, taskFilesPrefix } from '../utils/task.utils.js';
import { assertCanManage } from '../utils/task-roles.js';

/** An import's fields and its uploaded file; `stream.truncated` is set when it went over the upload limit. */
export interface ImportUpload extends TaskImportCreate {
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
    private readonly taskRepository: TaskRepository,
    private readonly spaceLookupRepository: SpaceLookupRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  async findAll(spaceId: string, query: TaskPageable): Promise<Page<Task>> {
    await this.requireSpace(spaceId);
    const [rows, total] = await Promise.all([
      this.taskRepository.findAll(spaceId, query),
      this.taskRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toTask);
  }

  async findOne(spaceId: string, id: string): Promise<Task> {
    return toTask(await this.requireTask(spaceId, id));
  }

  /** The task's file (export result or uploaded import). */
  async download(spaceId: string, id: string): Promise<TaskDownload> {
    const task = await this.requireTask(spaceId, id);
    const key = taskFileKey({ spaceId, id });
    const stat = await this.storage.stat(key);
    if (!stat) throw new NotFoundException('This task has no file');
    const filename = task.file?.name ?? `${task.kind.toLowerCase()}-${id}`;
    return { filename, size: stat.size, stream: this.storage.createReadStream(key) };
  }

  /** Exports and metadata regeneration. */
  async create(spaceId: string, input: TaskCreate, user: UserEntity): Promise<Task> {
    assertCanManage(user, input.kind);
    await this.requireSpace(spaceId);
    const id = newUuid();
    await this.taskRepository.create(spaceId, { id, ...input });
    return this.findOne(spaceId, id);
  }

  /**
   * Imports: the upload is stored as the task's original, then the task created. Its files are dropped again when
   * that fails. The caller checked `assertCanManage` (it must drain the upload when that fails).
   */
  async createImport(spaceId: string, upload: ImportUpload): Promise<Task> {
    await this.requireSpace(spaceId);
    const id = newUuid();
    try {
      const stored = await this.storage.put(taskFileKey({ spaceId, id }), upload.stream);
      if (upload.stream.truncated) throw new PayloadTooLargeException('File is too large');
      const translation = upload.kind === TaskKind.TRANSLATION_IMPORT;
      await this.taskRepository.create(spaceId, {
        id,
        kind: upload.kind,
        file: { name: upload.filename, size: stored.size },
        ...(translation ? { type: upload.locale ? 'flat-json' : 'full', locale: upload.locale ?? null } : {}),
      });
    } catch (error) {
      await this.storage.deletePrefix(taskFilesPrefix(spaceId, id));
      throw error;
    }
    return this.findOne(spaceId, id);
  }

  /** Logs cascade; the task's files go too. */
  async remove(spaceId: string, id: string, user: UserEntity): Promise<void> {
    const task = await this.requireTask(spaceId, id);
    assertCanManage(user, task.kind);
    await this.taskRepository.delete(spaceId, id);
    await this.storage.deletePrefix(taskFilesPrefix(spaceId, id));
  }

  private async requireTask(spaceId: string, id: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findOne(spaceId, id);
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }
}
