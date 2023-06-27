import {FieldValue, Timestamp} from 'firebase-admin/firestore';

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


// FireStore
export interface TaskUpdate extends Omit<Partial<Task>, "createdAt" | "updatedAt"> {
  updatedAt: FieldValue;
}
