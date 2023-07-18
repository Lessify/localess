import {Timestamp} from 'firebase-admin/firestore';
import {JSONSchemaType} from 'ajv';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  kind: ContentKind,
  name: string,
  slug: string
  parentSlug: string
  fullSlug: string

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentDocument extends ContentBase {
  kind: ContentKind.DOCUMENT
  schema: string;
  data?: ContentData;
  publishedAt?: Timestamp;
}

export interface ContentFolder extends ContentBase {
  kind: ContentKind.FOLDER
}

export enum ContentKind {
  FOLDER = 'FOLDER',
  DOCUMENT = 'DOCUMENT'
}

export interface PublishContentData {
  spaceId: string
  contentId: string
}

// Storage
export interface ContentDocumentStorage {
  id: string;
  name: string;
  slug: string;
  locale: string
  parentSlug: string
  fullSlug: string
  data?: ContentData;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface ContentData extends Record<string, any> {
  _id: string;
  schema: string;
}

export interface ContentLink {
  id: string,
  kind: ContentKind,
  name: string,
  slug: string
  parentSlug: string
  fullSlug: string
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Import and Export
export interface ContentFolderExport extends Omit<ContentFolder, 'createdAt' | 'updatedAt'> {
  id: string,
}

export interface ContentDocumentExport extends Omit<ContentDocument, 'createdAt' | 'updatedAt'> {
  id: string,
}

export type ContentExport = ContentDocumentExport | ContentFolderExport;

export const assetExportArraySchema: JSONSchemaType<ContentExport[]> = {
  type: 'array',
  items: {
    type: 'object',
    discriminator: {propertyName: 'kind'},
    required: ['kind', 'id', 'name', 'slug', 'parentSlug', 'fullSlug'],
    oneOf: [
      {
        properties: {
          id: {type: 'string', nullable: false},
          kind: {const: 'FOLDER'},
          name: {type: 'string', nullable: false},
          slug: {type: 'string', nullable: false},
          parentSlug: {type: 'string', nullable: false},
          fullSlug: {type: 'string', nullable: false},
        },
        additionalProperties: false,
      },
      {
        properties: {
          id: {type: 'string', nullable: false},
          kind: {const: 'DOCUMENT'},
          name: {type: 'string', nullable: false},
          slug: {type: 'string', nullable: false},
          parentSlug: {type: 'string', nullable: false},
          fullSlug: {type: 'string', nullable: false},
          schema: {type: 'string', nullable: false},
          data: {
            type: 'object',
            properties: {
              _id: {type: 'string'},
              schema: {type: 'string'},
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
};
