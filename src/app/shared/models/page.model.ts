import {FieldValue, Timestamp} from '@angular/fire/firestore';

export interface PageContentComponent extends Record<string, any>{
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
