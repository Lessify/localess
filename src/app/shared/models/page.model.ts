import {FieldValue, Timestamp} from '@angular/fire/firestore';

export interface Page {
  id: string;
  name: string;
  slug: string;
  schematic: string;

  content?: any;

  createdOn: Timestamp;
  updatedOn: Timestamp;
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
  createdOn: FieldValue;
  updatedOn: FieldValue;
}

export interface PageUpdateFS {
  name: string;
  slug: string;
  updatedOn: FieldValue;
}

export interface PageContentUpdateFS {
  content: any;
  updatedOn: FieldValue;
}
