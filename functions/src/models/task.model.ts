import { Timestamp } from 'firebase-admin/firestore';

export enum TaskKind {
  ASSET_EXPORT = 'ASSET_EXPORT',
  ASSET_IMPORT = 'ASSET_IMPORT',
  ASSET_REGEN_METADATA = 'ASSET_REGEN_METADATA',
  CONTENT_EXPORT = 'CONTENT_EXPORT',
  CONTENT_IMPORT = 'CONTENT_IMPORT',
  SCHEMA_EXPORT = 'SCHEMA_EXPORT',
  SCHEMA_IMPORT = 'SCHEMA_IMPORT',
  TRANSLATION_EXPORT = 'TRANSLATION_EXPORT',
  TRANSLATION_IMPORT = 'TRANSLATION_IMPORT',
}

export enum TaskStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  ERROR = 'ERROR',
  FINISHED = 'FINISHED',
}

export interface TaskFile {
  name: string;
  size: number;
}

export interface TaskBase {
  id: string;
  kind: TaskKind;
  status: TaskStatus;

  // Error Message
  message?: string;
  trace?: string;
  // Dates
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskAssetExport extends TaskBase {
  kind: TaskKind.ASSET_EXPORT;
  // Export Only data under this path
  path?: string;
  // Exported file
  file?: TaskFile;
}

export interface TaskAssetImport extends TaskBase {
  kind: TaskKind.ASSET_IMPORT;
  // Where Import Archive is located temporarily
  tmpPath: string;
  file: TaskFile;
}

export interface TaskAssetRegenMetadata extends TaskBase {
  kind: TaskKind.ASSET_REGEN_METADATA;
}

export interface TaskContentExport extends TaskBase {
  kind: TaskKind.CONTENT_EXPORT;
  // Export Only data under this path
  path?: string;
  // Exported file
  file?: TaskFile;
}

export interface TaskContentImport extends TaskBase {
  kind: TaskKind.CONTENT_IMPORT;
  // Where Import Archive is located temporarily
  tmpPath: string;
  file: TaskFile;
}

export interface TaskSchemaExport extends TaskBase {
  kind: TaskKind.SCHEMA_EXPORT;
  // Export Only change since this date
  fromDate?: number;
  // Exported file
  file?: TaskFile;
}

export interface TaskSchemaImport extends TaskBase {
  kind: TaskKind.SCHEMA_IMPORT;
  // Where Import Archive is located temporarily
  tmpPath: string;
  file: TaskFile;
}

export interface TaskTranslationExport extends TaskBase {
  kind: TaskKind.TRANSLATION_EXPORT;
  type: 'full' | 'flat-json' | 'nested-json';
  // Export Only change since this date
  fromDate?: number;
  // Export locale
  locale?: string;
  // Exported file
  file?: TaskFile;
}

export interface TaskTranslationImport extends TaskBase {
  kind: TaskKind.TRANSLATION_IMPORT;
  type: 'full' | 'flat-json' | 'nested-json';
  // Imported locale
  locale?: string;
  // Where Import Archive is located temporarily
  tmpPath: string;
  file: TaskFile;
}

export type Task =
  | TaskAssetExport
  | TaskAssetImport
  | TaskAssetRegenMetadata
  | TaskContentExport
  | TaskContentImport
  | TaskSchemaExport
  | TaskSchemaImport
  | TaskTranslationExport
  | TaskTranslationImport;

export type TaskExport = TaskAssetExport | TaskContentExport | TaskSchemaExport | TaskTranslationExport;

export type TaskImport = TaskAssetImport | TaskContentImport | TaskSchemaImport | TaskTranslationImport;

// FireStore
export interface TaskExportMetadata {
  kind: 'ASSET' | 'CONTENT' | 'SCHEMA' | 'TRANSLATION';
  fromDate?: number;
  path?: string;
}

/**
 * Type Guard for Asset Export Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskAssetExport(task: Task): task is TaskAssetExport {
  return task.kind === TaskKind.ASSET_EXPORT;
}

/**
 * Type Guard for Asset Import Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskAssetImport(task: Task): task is TaskAssetImport {
  return task.kind === TaskKind.ASSET_IMPORT;
}

/**
 * Type Guard for Asset Regenerate Metadata Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskAssetRegenMetadata(task: Task): task is TaskAssetRegenMetadata {
  return task.kind === TaskKind.ASSET_REGEN_METADATA;
}
/**
 * Type Guard for Content Export Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskContentExport(task: Task): task is TaskContentExport {
  return task.kind === TaskKind.CONTENT_EXPORT;
}
/**
 * Type Guard for Content Import Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskContentImport(task: Task): task is TaskContentImport {
  return task.kind === TaskKind.CONTENT_IMPORT;
}
/**
 * Type Guard for Schema Export Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskSchemaExport(task: Task): task is TaskSchemaExport {
  return task.kind === TaskKind.SCHEMA_EXPORT;
}
/**
 * Type Guard for Schema Import Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskSchemaImport(task: Task): task is TaskSchemaImport {
  return task.kind === TaskKind.SCHEMA_IMPORT;
}
/**
 * Type Guard for Translation Export Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskTranslationExport(task: Task): task is TaskTranslationExport {
  return task.kind === TaskKind.TRANSLATION_EXPORT;
}
/**
 * Type Guard for Translation Import Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskTranslationImport(task: Task): task is TaskTranslationImport {
  return task.kind === TaskKind.TRANSLATION_IMPORT;
}

/**
 * Type Guard for Export Task
 * @param {Task}task
 * @return {boolean}
 */
export function isTaskExport(task: Task): task is TaskAssetExport | TaskContentExport | TaskSchemaExport | TaskTranslationExport {
  return [TaskKind.ASSET_EXPORT, TaskKind.CONTENT_EXPORT, TaskKind.SCHEMA_EXPORT, TaskKind.TRANSLATION_EXPORT].includes(task.kind);
}
