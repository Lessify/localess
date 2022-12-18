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

export interface PageContentComponent extends Record<string, any> {
  _id: string;
  schematic: string;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  schematic: string;

  content?: PageContentComponent;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
}

// Service

export interface PageCreate {
  name: string;
  slug: string;
  schematic: string;
}

export interface PageUpdate {
  name: string;
  slug: string;
}

// Firestore

export interface PageCreateFS {
  name: string;
  slug: string;
  schematic: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface PageUpdateFS {
  name: string;
  slug: string;
  updatedAt: FieldValue;
}

export interface PageContentUpdateFS {
  content: PageContentComponent;
  updatedAt: FieldValue;
}
