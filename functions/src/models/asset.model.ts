import {Timestamp} from 'firebase-admin/firestore';
import {JSONSchemaType} from 'ajv';

export type Asset = AssetFile | AssetFolder;

export enum AssetKind {
  FOLDER = 'FOLDER',
  FILE = 'FILE'
}

export interface AssetBase {
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
  inProgress?: boolean,
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

// Import and Export
export interface AssetFolderExport extends Omit<AssetFolder, 'createdAt' | 'updatedAt'> {
  id: string,
}

export interface AssetFileExport extends Omit<AssetFile, 'createdAt' | 'updatedAt' | 'inProgress'> {
  id: string,
}

export type AssetExport = AssetFileExport | AssetFolderExport;

export const assetExportArraySchema: JSONSchemaType<AssetExport[]> = {
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
