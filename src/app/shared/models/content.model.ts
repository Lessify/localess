import { FieldValue, Timestamp } from '@angular/fire/firestore';
import { ValidationErrors } from '@angular/forms';

export function sortContent(a: Content, b: Content): number {
  const aIsFolder = a.kind === ContentKind.FOLDER ? 0 : 1;
  const bIsFolder = b.kind === ContentKind.FOLDER ? 0 : 1;
  return `${aIsFolder}${a.name}`.localeCompare(`${bIsFolder}${b.name}`);
}

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
  _schema?: string;
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
  links?: string[];
  references?: string[];
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

// Special Types

export interface ContentAsset {
  kind: 'ASSET';
  uri: string;
}

export type LinkContentType = 'url' | 'content';

export interface ContentLink {
  kind: 'LINK';
  type: LinkContentType;
  target: '_blank' | '_self';
  uri: string;
}

export interface ContentReference {
  kind: 'REFERENCE';
  uri: string;
}

export function isContentAsset(arg: any): arg is ContentAsset {
  return arg.kind === 'ASSET';
}

export function isContentLink(arg: any): arg is ContentLink {
  return arg.kind === 'LINK';
}

export function isContentReference(arg: any): arg is ContentReference {
  return arg.kind === 'REFERENCE';
}

export interface TranslateContentLocaleData {
  spaceId: string;
  contentId: string;
  sourceLocaleId?: string;
  targetLocaleId: string;
}
