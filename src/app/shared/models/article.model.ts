import {FieldValue, Timestamp} from '@angular/fire/firestore';

export interface Article {
  id: string;
  name: string;
  slug: string;
  schematicId: string;

  content?: any;

  createdOn: Timestamp;
  updatedOn: Timestamp;
}

// Service

export interface ArticleCreate {
  name: string;
  slug: string;
  schematicId: string;
}

export interface ArticleUpdate {
  name: string;
  slug: string;
}

// Firestore

export interface ArticleCreateFS {
  name: string;
  slug: string;
  schematicId: string;
  createdOn: FieldValue;
  updatedOn: FieldValue;
}

export interface ArticleUpdateFS {
  name: string;
  slug: string;
  updatedOn: FieldValue;
}

export interface ArticleContentUpdateFS {
  content: any;
  updatedOn: FieldValue;
}
