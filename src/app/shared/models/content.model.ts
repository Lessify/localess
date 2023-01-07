import {FieldValue, Timestamp} from '@angular/fire/firestore';
import {ValidationErrors} from '@angular/forms';

export interface ContentError {
  contentId: string;
  schematic: string;
  fieldName: string;
  fieldDisplayName?: string;
  errors: ValidationErrors | null;
}

export function isPageContentComponent(obj: any): boolean {
  return '_id' in obj && 'schematic' in obj;
}

export interface ContentPageData extends Record<string, any> {
  _id: string;
  schematic: string;
}

export type Content = ContentPage | ContentFolder;

export interface ContentBase {
  id: string,
  kind: ContentKind,
  name: string,
  slug: string

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContentPage extends ContentBase {
  kind: ContentKind.PAGE
  schematic: string;
  data?: ContentPageData;
  publishedAt?: Timestamp;
}

export interface ContentFolder extends ContentBase {
  kind: ContentKind.FOLDER
}

export enum ContentKind {
  FOLDER = 'FOLDER',
  PAGE = 'PAGE'
}

// Service

export interface ContentPageCreate {
  name: string;
  slug: string;
  schematic: string;
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

export interface ContentPageCreateFS {
  kind: ContentKind.PAGE
  name: string;
  slug: string;
  schematic: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface ContentUpdateFS {
  name: string;
  slug: string;
  updatedAt: FieldValue;
}

export interface ContentPageDataUpdateFS {
  data: ContentPageData;
  updatedAt: FieldValue;
}

export interface ContentFolderCreateFS {
  kind: ContentKind.FOLDER
  name: string;
  slug: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}
