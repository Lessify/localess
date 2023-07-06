import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum TaskKind {
  ASSET_EXPORT = 'ASSET_EXPORT',
  ASSET_IMPORT = 'ASSET_IMPORT',
  CONTENT_EXPORT = 'CONTENT_EXPORT',
  CONTENT_IMPORT = 'CONTENT_IMPORT',
  SCHEMA_EXPORT = 'SCHEMA_EXPORT',
  SCHEMA_IMPORT = 'SCHEMA_IMPORT',
  TRANSLATION_EXPORT = 'TRANSLATION_EXPORT',
  TRANSLATION_IMPORT = 'TRANSLATION_IMPORT'
}

export enum TaskStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  ERROR = 'ERROR',
  FINISHED = 'FINISHED',
}

export interface TaskFile {
  name: string,
  size: number,
}

export interface Task {
  id: string,
  kind: TaskKind,
  status: TaskStatus,

  file?: TaskFile
  fromDate?: number
  locale?: string

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskCreateFS {
  kind: TaskKind,
  status: TaskStatus

  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface TaskAssetExportCreateFS extends TaskCreateFS {
  kind: TaskKind.ASSET_EXPORT,
  status: TaskStatus.INITIATED,
  fromDate?: number
}

export interface TaskAssetImportCreateFS extends TaskCreateFS {
  kind: TaskKind.ASSET_IMPORT,
  status: TaskStatus.INITIATED,
  tmpPath: string
  file: TaskFile
}

export interface TaskContentExportCreateFS extends TaskCreateFS {
  kind: TaskKind.CONTENT_EXPORT,
  status: TaskStatus.INITIATED,
  fromDate?: number
}

export interface TaskContentImportCreateFS extends TaskCreateFS {
  kind: TaskKind.CONTENT_IMPORT,
  status: TaskStatus.INITIATED,
  tmpPath: string
  file: TaskFile
}

export interface TaskSchemaExportCreateFS extends TaskCreateFS {
  kind: TaskKind.SCHEMA_EXPORT,
  status: TaskStatus.INITIATED,
  fromDate?: number
}

export interface TaskSchemaImportCreateFS extends TaskCreateFS {
  kind: TaskKind.SCHEMA_IMPORT,
  status: TaskStatus.INITIATED,
  tmpPath: string
  file: TaskFile
}

export interface TaskTranslationExportCreateFS extends TaskCreateFS {
  kind: TaskKind.TRANSLATION_EXPORT,
  status: TaskStatus.INITIATED,
  locale?: string,
  fromDate?: number
}

export interface TaskTranslationImportCreateFS extends TaskCreateFS {
  kind: TaskKind.TRANSLATION_IMPORT,
  status: TaskStatus.INITIATED,
  locale?: string,
  tmpPath: string
  file: TaskFile
}
