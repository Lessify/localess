import {Timestamp} from 'firebase-admin/firestore';

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

export interface Task {
  id: string,
  kind: TaskKind,
  status: TaskStatus,

  tmpPath?: string
  file?: {
    name: string,
    size: number,
  }

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// FireStore
