import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export interface Translation {
  id: string;
  name: string;
  type: TranslationType;
  locales: { [key: string]: string };
  labels: string[]
  description: string;
  createdOn: Timestamp;
  updatedOn: Timestamp;
}

export interface TranslationCreate {
  name: string;
  type: TranslationType;
  labels: string[]
  description: string;
  locale: string;
  value: string;
}

export interface TranslationCreateFS {
  name: string;
  type: TranslationType;
  locales: { [key: string]: string };
  labels: string[]
  description: string;
  createdOn: FieldValue;
  updatedOn: FieldValue;
}

export interface TranslationUpdate {
  labels: string[]
  description: string;
}

export interface TranslationUpdateFS {
  labels: string[]
  description: string;
  updatedOn: FieldValue;
}

export interface TranslationLocaleUpdateFS {
  updatedOn: FieldValue;
}
