import {FieldValue, Timestamp} from '@angular/fire/firestore';
import {ValidationErrors} from '@angular/forms';

export interface ContentError {
  contentId: string;
  schema: string;
  fieldName: string;
  fieldDisplayName?: string;
  errors: ValidationErrors | null;
}

export interface ContentData extends Record<string, any> {
  _id: string;
  schema: string;
}

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
  editorEnabled?: boolean
}

export interface ContentFolder extends ContentBase {
  kind: ContentKind.FOLDER
}

export enum ContentKind {
  FOLDER = 'FOLDER',
  DOCUMENT = 'DOCUMENT'
}

// Service

export interface ContentDocumentCreate {
  name: string;
  slug: string;
  schema: string;
}

export interface ContentUpdate {
  name: string;
  slug: string;
}

export interface ContentFolderCreate {
  name: string;
  slug: string;
}

// Firestore

export interface ContentCreateFS {
  kind: ContentKind
  name: string;
  slug: string;
  parentSlug: string
  fullSlug: string

  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface ContentDocumentCreateFS extends ContentCreateFS {
  kind: ContentKind.DOCUMENT
  schema: string;
}

export interface ContentFolderCreateFS extends ContentCreateFS {
  kind: ContentKind.FOLDER
}

// Events
export interface EditorEvent {
  owner: string,
  id: string
}

// Special Types

export interface AssetContent {
  kind: 'ASSET'
  uri: string
}

export interface LinkContent {
  kind: 'LINK'
  type: 'url' | 'content'
  target: '_blank' | '_self'
  uri: string
}

export interface ReferenceContent {
  kind: 'REFERENCE'
  uri: string
}
