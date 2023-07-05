import {FieldValue, Timestamp} from 'firebase-admin/firestore';
import {JSONSchemaType} from 'ajv';

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

// Import and Export
export type AssetExportImport = Omit<Asset, 'createdAt' | 'updatedAt'>

export const assetExportImportArraySchema: JSONSchemaType<AssetExportImport[]> = {
  type: 'array',
  items: {
    type: 'object',
    discriminator: {propertyName: 'kind'},
    required: ['kind', 'id', 'name', 'parentPath'],
    oneOf: [
      {
        properties: {
          id: {type: 'string', nullable: false},
          kind: {const: 'FOLDER'},
          name: {type: 'string', nullable: false},
          parentPath: {type: 'string', nullable: false},
        },
        // required: ['id', 'name', 'parentPath'],
        additionalProperties: false,
      },
      {
        properties: {
          id: {type: 'string', nullable: false},
          kind: {const: 'FILE'},
          name: {type: 'string', nullable: false},
          parentPath: {type: 'string', nullable: false},
          extension: {type: 'string', nullable: false},
          type: {type: 'string', nullable: false},
          size: {type: 'integer', nullable: false},
          alt: {type: 'string'},
          metadata: {
            type: 'object',
            properties: {
              format: {type: 'string'},
              width: {type: 'integer'},
              height: {type: 'integer'},
            },
            additionalProperties: false,
          },
          // required: ['id', 'name', 'parentPath'],
        },
        additionalProperties: false,
      },
    ],
  },
};
