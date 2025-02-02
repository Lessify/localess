import { FieldValue, Timestamp } from '@angular/fire/firestore';

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

export interface Task {
  id: string;
  kind: TaskKind;
  status: TaskStatus;

  // import/export file
  file?: TaskFile;
  // export by date
  fromDate?: number;
  // export content
  path?: string;
  // translations
  locale?: string;

  message?: string;
  trace?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskCreateFS {
  kind: TaskKind;
  status: TaskStatus;

  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface TaskAssetExportCreateFS extends TaskCreateFS {
  kind: TaskKind.ASSET_EXPORT;
  status: TaskStatus.INITIATED;
  path?: string;
}

export interface TaskAssetImportCreateFS extends TaskCreateFS {
  kind: TaskKind.ASSET_IMPORT;
  status: TaskStatus.INITIATED;
  tmpPath: string;
  file: TaskFile;
}

export interface TaskAssetRegenerateMetadataCreateFS extends TaskCreateFS {
  kind: TaskKind.ASSET_REGEN_METADATA;
  status: TaskStatus.INITIATED;
}

export interface TaskContentExportCreateFS extends TaskCreateFS {
  kind: TaskKind.CONTENT_EXPORT;
  status: TaskStatus.INITIATED;
  path?: string;
}

export interface TaskContentImportCreateFS extends TaskCreateFS {
  kind: TaskKind.CONTENT_IMPORT;
  status: TaskStatus.INITIATED;
  tmpPath: string;
  file: TaskFile;
}

export interface TaskSchemaExportCreateFS extends TaskCreateFS {
  kind: TaskKind.SCHEMA_EXPORT;
  status: TaskStatus.INITIATED;
  fromDate?: number;
}

export interface TaskSchemaImportCreateFS extends TaskCreateFS {
  kind: TaskKind.SCHEMA_IMPORT;
  status: TaskStatus.INITIATED;
  tmpPath: string;
  file: TaskFile;
}

export interface TaskTranslationExportCreateFS extends TaskCreateFS {
  kind: TaskKind.TRANSLATION_EXPORT;
  status: TaskStatus.INITIATED;
  fromDate?: number;
  locale?: string;
}

export interface TaskTranslationImportCreateFS extends TaskCreateFS {
  kind: TaskKind.TRANSLATION_IMPORT;
  status: TaskStatus.INITIATED;
  locale?: string;
  tmpPath: string;
  file: TaskFile;
}
