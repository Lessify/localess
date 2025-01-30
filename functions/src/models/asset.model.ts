import { Timestamp } from 'firebase-admin/firestore';

export type Asset = AssetFile | AssetFolder;

export enum AssetKind {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
}

export interface AssetBase {
  kind: AssetKind;
  name: string;
  parentPath: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssetFolder extends AssetBase {
  kind: AssetKind.FOLDER;
}

export interface AssetFile extends AssetBase {
  kind: AssetKind.FILE;
  inProgress?: boolean;
  extension: string;
  type: string;
  size: number;
  alt?: string;
  metadata?: AssetMetadata;
  source?: string;
}

export interface AssetMetadata {
  format?: string;
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  animated?: boolean;
}

// Import and Export
export interface AssetFolderExport extends Omit<AssetFolder, 'createdAt' | 'updatedAt'> {
  id: string;
}

export interface AssetFileExport extends Omit<AssetFile, 'createdAt' | 'updatedAt' | 'inProgress'> {
  id: string;
}

export type AssetExport = AssetFileExport | AssetFolderExport;
