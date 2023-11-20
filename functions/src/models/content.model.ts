import { Timestamp } from 'firebase-admin/firestore';
import { JSONSchemaType } from 'ajv';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  kind: ContentKind;
  name: string;

  // Slug
  slug: string;
  parentSlug: string;
  fullSlug: string;

  // Lock
  locked?: boolean;
  lockedBy?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentDocument<T extends ContentData = ContentData> extends ContentBase {
  kind: ContentKind.DOCUMENT;
  schema: string;
  data?: T;
  publishedAt?: Timestamp;
  editorEnabled?: boolean;
}

export interface ContentFolder extends ContentBase {
  kind: ContentKind.FOLDER;
}

export enum ContentKind {
  FOLDER = 'FOLDER',
  DOCUMENT = 'DOCUMENT',
}

export interface PublishContentData {
  spaceId: string;
  contentId: string;
}

// Storage
export interface ContentDocumentStorage {
  id: string;
  name: string;
  slug: string;
  locale: string;
  parentSlug: string;
  fullSlug: string;
  data?: ContentData;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface ContentData extends Record<string, any | ContentData | ContentData[]> {
  _id: string;
  schema: string;
}

export interface ContentLink {
  id: string;
  kind: ContentKind;
  name: string;
  slug: string;
  parentSlug: string;
  fullSlug: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface AssetContent {
  kind: 'ASSET';
  uri: string;
}

export interface LinkContent {
  kind: 'LINK';
  type: 'url' | 'content';
  target: '_blank' | '_self';
  uri: string;
}

export interface ReferenceContent {
  kind: 'REFERENCE';
  uri: string;
}

// Import and Export
export interface ContentFolderExport extends Omit<ContentFolder, 'createdAt' | 'updatedAt'> {
  id: string;
}

export interface ContentDocumentExport extends Omit<ContentDocument, 'createdAt' | 'updatedAt'> {
  id: string;
}

export type ContentExport = ContentDocumentExport | ContentFolderExport;

export const contentExportArraySchema: JSONSchemaType<ContentExport[]> = {
  type: 'array',
  items: {
    type: 'object',
    discriminator: { propertyName: 'kind' },
    required: ['kind', 'id', 'name', 'slug', 'parentSlug', 'fullSlug'],
    oneOf: [
      {
        properties: {
          id: { type: 'string', nullable: false },
          kind: { const: 'FOLDER' },
          name: { type: 'string', nullable: false },
          slug: { type: 'string', nullable: false },
          parentSlug: { type: 'string', nullable: false },
          fullSlug: { type: 'string', nullable: false },
        },
        additionalProperties: false,
      },
      {
        properties: {
          id: { type: 'string', nullable: false },
          kind: { const: 'DOCUMENT' },
          name: { type: 'string', nullable: false },
          slug: { type: 'string', nullable: false },
          parentSlug: { type: 'string', nullable: false },
          fullSlug: { type: 'string', nullable: false },
          schema: { type: 'string', nullable: false },
          editorEnabled: { type: 'boolean', nullable: true },
          data: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              schema: { type: 'string' },
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
};
