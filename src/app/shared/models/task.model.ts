import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum TaskKind {
  ASSET_EXPORT = 'ASSET_EXPORT',
  ASSET_IMPORT = 'ASSET_IMPORT',
  CONTENT_EXPORT = 'CONTENT_EXPORT',
  CONTENT_IMPORT = 'CONTENT_IMPORT'
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
}

export interface TaskAssetImportCreateFS extends TaskCreateFS {
  kind: TaskKind.ASSET_IMPORT,
  status: TaskStatus.INITIATED,
  tmpPath: string
  file: TaskFile
}