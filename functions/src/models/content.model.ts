import {Timestamp} from 'firebase-admin/firestore';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  id: string,
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
