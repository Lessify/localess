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
  FINISHED = 'FINISHED',
}

export interface Task {
  id: string,
  kind: TaskKind,
  status: TaskStatus,

  size?: number,

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskCreateFS {
  kind: TaskKind,
  status: TaskStatus,
  size?: number,
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
