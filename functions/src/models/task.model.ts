import {Timestamp} from 'firebase-admin/firestore';

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

export interface Task {
  id: string,
  kind: TaskKind,
  status: TaskStatus,
  // Export Only
  fromDate?: number,
  locale?: string,
  uri?: string,
  // Import Only
  tmpPath?: string,
  file?: {
    name: string,
    size: number,
  }
  // Error Message
  message?: string
  // Dates
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// FireStore
export interface TaskExportMetadata {
  kind: 'ASSET' | 'CONTENT' | 'SCHEMA' | 'TRANSLATION',
  fromDate?: number,
}
