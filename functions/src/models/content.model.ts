import { Timestamp } from 'firebase-admin/firestore';

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

  updatedBy?: {
    name: string;
    email: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentDocument<T extends ContentData = ContentData> extends ContentBase {
  kind: ContentKind.DOCUMENT;
  schema: string;
  data?: T;
  publishedAt?: Timestamp;
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

export interface ContentDocumentExport extends Omit<ContentDocument, 'createdAt' | 'updatedAt' | 'publishedAt'> {
  id: string;
}

export type ContentExport = ContentDocumentExport | ContentFolderExport;
