import {FieldValue, Timestamp} from 'firebase-admin/firestore';
import {Asset} from "./asset.model";

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

export interface TaskFile {
  path: string,
  type: string,
  name: string,
  size: number,
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
export interface TaskUpdate extends Omit<Partial<Task>, 'createdAt' | 'updatedAt'> {
  updatedAt: FieldValue;
}

export type AssetExportImport = Omit<Asset, 'createdAt' | 'updatedAt'>
