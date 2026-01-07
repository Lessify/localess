import { Timestamp } from '@angular/fire/firestore';

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

export type TaskAssetExportFS = Omit<TaskAssetExport, 'id'>;
export type TaskAssetImportFS = Omit<TaskAssetImport, 'id'>;
export type TaskAssetRegenerateMetadataFS = Omit<TaskAssetRegenMetadata, 'id'>;
export type TaskContentExportFS = Omit<TaskContentExport, 'id'>;
export type TaskContentImportFS = Omit<TaskContentImport, 'id'>;
export type TaskSchemaExportFS = Omit<TaskSchemaExport, 'id'>;
export type TaskSchemaImportFS = Omit<TaskSchemaImport, 'id'>;
export type TaskTranslationExportFS = Omit<TaskTranslationExport, 'id'>;
export type TaskTranslationImportFS = Omit<TaskTranslationImport, 'id'>;
