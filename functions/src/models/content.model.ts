import { Timestamp } from 'firebase-admin/firestore';

export type Content = ContentDocument | ContentFolder;

export interface ContentBase {
  kind: ContentKind;
  name: string;

  // Slug
  slug: string;
  parentSlug: string;
  fullSlug: string;

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
  data?: T | string;
  publishedAt?: Timestamp;
  assets?: string[];
  references?: string[];
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
  kind: ContentKind;
  slug: string;
  locale: string;
  parentSlug: string;
  fullSlug: string;
  data?: ContentData;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  links?: Record<string, ContentLink>;
}

export interface ContentData extends Record<string, any | ContentData | ContentData[]> {
  _id: string;
  _schema?: string;
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

export interface RichTextContent {
  type?: string;
  content?: RichTextContent[];
}

// export type RichTextContent = {
//   type?: string;
//   attrs?: Record<string, any>;
//   content?: RichTextContent[];
//   marks?: {
//     type: string;
//     attrs?: Record<string, any>;
//     [key: string]: any;
//   }[];
//   text?: string;
//   [key: string]: any;
// };

// Import and Export
export interface ContentFolderExport extends Omit<ContentFolder, 'createdAt' | 'updatedAt'> {
  id: string;
}

export interface ContentDocumentExport extends Omit<ContentDocument, 'createdAt' | 'updatedAt' | 'publishedAt'> {
  id: string;
}

export type ContentExport = ContentDocumentExport | ContentFolderExport;
