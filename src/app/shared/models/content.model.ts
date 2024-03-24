import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { ValidationErrors } from '@angular/forms';

export interface ContentError {
  contentId: string;
  locale: string;
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
  id: string;
  kind: ContentKind;
  name: string;

  //Slug
  slug: string;
  parentSlug: string;
  fullSlug: string;

  //Lock
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
  kind: ContentKind;
  name: string;
  slug: string;
  parentSlug: string;
  fullSlug: string;

  updatedBy?: {
    name: string;
    email: string;
  };

  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface ContentDocumentCreateFS extends ContentCreateFS {
  kind: ContentKind.DOCUMENT;
  schema: string;
  data?: any;
}

export interface ContentFolderCreateFS extends ContentCreateFS {
  kind: ContentKind.FOLDER;
}

// Events
export interface EditorEvent {
  owner: string;
  id: string;
}

// Special Types

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

export function isAssetContent(arg: any): arg is AssetContent {
  return arg.kind === 'ASSET';
}

export function isLinkContent(arg: any): arg is LinkContent {
  return arg.kind === 'LINK';
}

export function isReferenceContent(arg: any): arg is ReferenceContent {
  return arg.kind === 'REFERENCE';
}
