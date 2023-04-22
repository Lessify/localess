import {FieldValue, Timestamp} from 'firebase-admin/firestore';

export type Asset = AssetFile | AssetFolder;

export enum AssetKind {
  FOLDER = 'FOLDER',
  FILE = 'FILE'
}

export interface AssetBase {
  id: string,
  kind: AssetKind,
  name: string,
  parentPath: string,

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AssetFolder extends AssetBase {
  kind: AssetKind.FOLDER
}

export interface AssetFile extends AssetBase {
  kind: AssetKind.FILE
  extension: string,
  type: string,
  size: number,
  alt?: string,
  metadata?: AssetMetadata
}

export interface AssetMetadata {
  format?: string;
  width?: number;
  height?: number;
}

export interface UpdateAssetUpload {
  uploaded: true,
  size?: number,
  metadata?: AssetMetadata
  updatedAt: FieldValue,
}
