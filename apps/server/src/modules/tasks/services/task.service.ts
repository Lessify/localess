import type { Readable } from 'node:stream';

import {
  LOCALESS_FILE_EXTENSION,
  type Page,
  type Task,
  type TaskActiveQuery,
  type TaskCreate,
  type TaskImportCreate,
  TaskKind,
  taskKindsFor,
  type TaskPageable,
  type TranslationImportParams,
  type TranslationTranslateParams,
} from '@localess/shared';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';

import { newUuid } from '../../../infra/database/id.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../../infra/storage/storage.driver.js';
import type { TaskSelect } from '../../../shared/entities/task.entity.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { TranslateService } from '../../../shared/services/translate.service.js';
import { toTask } from '../../../shared/transformers/task.transformer.js';
import { sanitizeFileName } from '../../../shared/utils/file-name.js';
import { toPage } from '../../../shared/utils/paging.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { MAX_LOCALE_FILE_BYTES, taskFileKey, taskFilesPrefix } from '../utils/task.utils.js';
import { assertCanManage } from '../utils/task-roles.js';
import { EntryTooLargeError, limited } from '../utils/zip.js';
import { TaskProgressService } from './task-progress.service.js';

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

/** The file names an import accepts: a key-value JSON for `translation-json-flat`, else a `.localess.zip` or the old archive of its kind. */
function importExtensions(upload: Pick<ImportUpload, 'kind' | 'type'>): string[] {
  if (upload.kind === TaskKind.SCHEMA_IMPORT) return [LOCALESS_FILE_EXTENSION, '.lls.zip'];
  return upload.type === 'translation-json-flat' ? ['.json'] : [LOCALESS_FILE_EXTENSION, '.llt.zip'];
}

/** An import's `params`: a translation import's type (and locale); none for a schema import. */
function importParams(upload: TaskImportCreate): TranslationImportParams | null {
  if (upload.kind !== TaskKind.TRANSLATION_IMPORT) return null;
  return upload.type === 'translation-json-flat'
    ? { type: 'translation-json-flat', locale: upload.locale as string }
    : { type: 'translation-full' };
}

/**
 * Export/import tasks (was `spaces/{s}/tasks`, created by the browser and run by `task-oncreate`).
 * Rows are created QUEUED; the task worker picks them up.
 */
@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly spaceLookupRepository: SpaceLookupRepository,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly translateService: TranslateService,
    private readonly taskProgressService: TaskProgressService,
  ) {}

  /** The space's tasks of the kinds `user` may start (a filter on another kind finds none). */
  async findAll(spaceId: string, query: TaskPageable, user: UserEntity): Promise<Page<Task>> {
    await this.requireSpace(spaceId);
    const kinds = taskKindsFor(user);
    const [rows, total] = await Promise.all([
      this.taskRepository.findAll(spaceId, kinds, query),
      this.taskRepository.findAllCount(spaceId, kinds, query),
    ]);
    return toPage(rows, total, query, toTask);
  }

  /**
   * The space's queued and running tasks (of the query's kinds), oldest first, with the running one's latest progress.
   * Every role sees them, whatever kinds it may start, so a screen tells everyone what is about to change its data.
   * Without the file: reading it stays with the roles of its kind (`download`).
   */
  async findActive(spaceId: string, query: TaskActiveQuery): Promise<Task[]> {
    await this.requireSpace(spaceId);
    const rows = await this.taskRepository.findActive(spaceId, query.kind);
    return rows.map(row => {
      const task = toTask(row);
      delete task.file;
      const progress = this.taskProgressService.findOne(row.id);
      return progress ? { ...task, progress } : task;
    });
  }

  /** 404 for a task of a kind `user` may not start, as for an unknown one. */
  async findOne(spaceId: string, id: string, user: UserEntity): Promise<Task> {
    return toTask(await this.requireTask(spaceId, id, user));
  }

  /** The task's file (export result or uploaded import). */
  async download(spaceId: string, id: string, user: UserEntity): Promise<TaskDownload> {
    const task = await this.requireTask(spaceId, id, user);
    if (!task.file) throw new NotFoundException('This task has no file');
    const key = taskFileKey(task, task.file.name);
    const stat = await this.storage.stat(key);
    if (!stat) throw new NotFoundException('This task has no file');
    return { filename: task.file.name, size: stat.size, stream: this.storage.createReadStream(key) };
  }

  /** Exports and metadata regeneration. */
  async create(spaceId: string, input: TaskCreate, user: UserEntity): Promise<Task> {
    assertCanManage(user, input.kind);
    await this.requireSpace(spaceId);
    if (input.kind === TaskKind.TRANSLATION_TRANSLATE) await this.checkTranslate(spaceId, input.params);
    const id = newUuid();
    await this.taskRepository.create(spaceId, { id, ...input, createdById: user.id });
    return this.findOne(spaceId, id, user);
  }

  /**
   * Imports: the upload is stored under its sanitised name, then the task created with its `params` (a translation
   * import's format and locale). Its files are dropped again when that fails. The caller checked `assertCanManage` (it
   * must drain the upload when that fails).
   */
  async createImport(spaceId: string, upload: ImportUpload, user: UserEntity): Promise<Task> {
    const name = sanitizeFileName(upload.filename);
    const extensions = importExtensions(upload);
    if (!extensions.some(it => name.toLowerCase().endsWith(it))) {
      upload.stream.resume();
      throw new BadRequestException(`Expected a ${extensions.join(' or ')} file`);
    }
    await this.requireSpace(spaceId);
    const id = newUuid();
    try {
      const stored = await this.storage.put(taskFileKey({ spaceId, id }, name), this.limited(upload));
      if (upload.stream.truncated) throw new PayloadTooLargeException('File is too large');
      await this.taskRepository.create(spaceId, {
        id,
        kind: upload.kind,
        params: importParams(upload),
        file: { name, size: stored.size },
        createdById: user.id,
      });
    } catch (error) {
      await this.storage.deletePrefix(taskFilesPrefix(spaceId, id));
      if (error instanceof EntryTooLargeError) {
        throw new PayloadTooLargeException(`File is too large (at most ${MAX_LOCALE_FILE_BYTES / 1024 / 1024} MB)`);
      }
      throw error;
    }
    return this.findOne(spaceId, id, user);
  }

  /**
   * The upload as stored: a key-value JSON (read whole by its task) stops at its cap, the rest of the request drained
   * and a 413 answered.
   */
  private limited(upload: ImportUpload): Readable {
    return upload.type === 'translation-json-flat' ? limited(upload.stream, MAX_LOCALE_FILE_BYTES, upload.filename) : upload.stream;
  }

  /** Logs cascade; the task's files go too. A queued or running task is refused (409). */
  async remove(spaceId: string, id: string, user: UserEntity): Promise<void> {
    const task = await this.requireTask(spaceId, id, user);
    assertCanManage(user, task.kind);
    if (!(await this.taskRepository.delete(spaceId, id)))
      throw new ConflictException('The task is queued or running: it can be deleted once it ends');
    await this.storage.deletePrefix(taskFilesPrefix(spaceId, id));
  }

  private async requireTask(spaceId: string, id: string, user: UserEntity): Promise<TaskSelect> {
    const task = await this.taskRepository.findOne(spaceId, id, taskKindsFor(user));
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  /** A translate-locale task fails when it is created, not in the queue: both locales in the space (400), a provider (412). */
  private async checkTranslate(spaceId: string, params: TranslationTranslateParams): Promise<void> {
    const space = await this.spaceLookupRepository.findOne(spaceId);
    for (const locale of [params.sourceLocale, params.targetLocale]) {
      if (!space?.spaceLocales.some(it => it.localeId === locale))
        throw new BadRequestException(`Locale ${locale} is not in the space locales.`);
    }
    this.translateService.requireProvider();
  }

  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }
}
