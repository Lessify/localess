import { ADMINS, CONTENT_WRITERS, DEVELOPERS, hasRole, TRANSLATORS } from '../roles.js';
import type { Timestamp } from './timestamp.js';
import type { UserRole } from './user.model.js';

export enum TaskKind {
  ASSET_REGEN_METADATA = 'ASSET_REGEN_METADATA',
  SCHEMA_EXPORT = 'SCHEMA_EXPORT',
  SCHEMA_IMPORT = 'SCHEMA_IMPORT',
  TRANSLATION_EXPORT = 'TRANSLATION_EXPORT',
  TRANSLATION_IMPORT = 'TRANSLATION_IMPORT',
  TRANSLATION_TRANSLATE = 'TRANSLATION_TRANSLATE',
}

/** Who may start, read and delete a task of each kind (the server checks it; the web shows only these kinds). */
export const TASK_KIND_ROLES: Record<TaskKind, readonly UserRole[]> = {
  [TaskKind.ASSET_REGEN_METADATA]: ADMINS,
  [TaskKind.SCHEMA_EXPORT]: DEVELOPERS,
  [TaskKind.SCHEMA_IMPORT]: DEVELOPERS,
  [TaskKind.TRANSLATION_EXPORT]: CONTENT_WRITERS,
  [TaskKind.TRANSLATION_IMPORT]: CONTENT_WRITERS,
  [TaskKind.TRANSLATION_TRANSLATE]: TRANSLATORS,
};

/** The kinds `user` may start (and so read), sorted. */
export function taskKindsFor(user: { role?: UserRole | null } | null | undefined): TaskKind[] {
  return Object.values(TaskKind)
    .filter(kind => hasRole(user, TASK_KIND_ROLES[kind]))
    .sort();
}

export enum TaskStatus {
  /** Waiting in the queue: no instance has picked it up yet. */
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  ERROR = 'ERROR',
  FINISHED = 'FINISHED',
}

/** The field the Tasks page may sort by: newest first by default. Request schemas: `task.zod.ts`. */
export const TASK_SORT_FIELDS = ['createdAt'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export enum TaskLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface TaskLog {
  id: string;
  level: TaskLogLevel;
  message: string;
  trace?: string;
  createdAt: Timestamp;
}

/** A task's file: the upload of an import, or what an export produced. */
export interface TaskFile {
  name: string;
  size: number;
}

/** What a running task is doing: its step (`Reading file`, `Checking`, `Writing`, …) and how far it got. Sent in events. */
export interface TaskProgress {
  step: string;
  done: number;
  /** Absent while unknown (an indeterminate bar). */
  total?: number;
}

/** Who started a task. */
export interface TaskUser {
  id: string;
  email: string;
  displayName?: string;
}

/**
 * A task's input, discriminated by `type` (so the app can switch on it): what a translation import reads, or what a
 * translate-locale task translates. Nested JSON is not supported yet.
 */
export const TASK_PARAMS_TYPES = ['translation-full', 'translation-json-flat', 'translation-translate'] as const;
export type TaskParamsType = (typeof TASK_PARAMS_TYPES)[number];

/** The types a translation import reads: a `.localess.zip` (or old `.llt.zip`), or one locale as key-value JSON. */
export const TRANSLATION_IMPORT_TYPES = ['translation-full', 'translation-json-flat'] as const;

/** A translation import of a `.localess.zip` (or an old `.llt.zip`): every locale the file holds. */
export interface TranslationFullParams {
  type: 'translation-full';
}

/** A translation import of one locale from a key-value JSON. */
export interface TranslationJsonFlatParams {
  type: 'translation-json-flat';
  locale: string;
}

export type TranslationImportParams = TranslationFullParams | TranslationJsonFlatParams;

/** A translate-locale task's input. */
export interface TranslationTranslateParams {
  type: 'translation-translate';
  sourceLocale: string;
  targetLocale: string;
  /** Replace target values that already exist instead of filling only the empty ones. */
  overwrite: boolean;
}

/** A `tasks` row as the App API answers it. */
export interface TaskBase {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  /** The export's file, or the uploaded one. */
  file?: TaskFile;
  /** Present when the user still exists. */
  createdBy?: TaskUser;
  /** When an instance picked it up (the end of the wait). */
  startedAt?: Timestamp;
  /** When it ended. */
  finishedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskAssetRegenMetadata extends TaskBase {
  kind: TaskKind.ASSET_REGEN_METADATA;
}

export interface TaskSchemaExport extends TaskBase {
  kind: TaskKind.SCHEMA_EXPORT;
}

export interface TaskSchemaImport extends TaskBase {
  kind: TaskKind.SCHEMA_IMPORT;
}

export interface TaskTranslationExport extends TaskBase {
  kind: TaskKind.TRANSLATION_EXPORT;
}

export interface TaskTranslationImport extends TaskBase {
  kind: TaskKind.TRANSLATION_IMPORT;
  params: TranslationImportParams;
}

export interface TaskTranslationTranslate extends TaskBase {
  kind: TaskKind.TRANSLATION_TRANSLATE;
  params: TranslationTranslateParams;
}

export type Task =
  | TaskAssetRegenMetadata
  | TaskSchemaExport
  | TaskSchemaImport
  | TaskTranslationExport
  | TaskTranslationImport
  | TaskTranslationTranslate;

/** The input a task of any kind may carry. */
export type TaskParams = TranslationImportParams | TranslationTranslateParams;

/** The kinds whose task ends with a file to download. */
export const EXPORT_TASK_KINDS: readonly TaskKind[] = [TaskKind.SCHEMA_EXPORT, TaskKind.TRANSLATION_EXPORT];

export function isTaskExport(task: Pick<Task, 'kind'>): boolean {
  return EXPORT_TASK_KINDS.includes(task.kind);
}

// The legacy (Firebase-era) archive's metadata.json; read only by the import of old files.
export interface TaskExportMetadata {
  kind: 'ASSET' | 'CONTENT' | 'SCHEMA' | 'TRANSLATION';
  path?: string;
}
