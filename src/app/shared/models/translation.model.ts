import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export interface Translation {
  id: string;
  type: TranslationType;
  locales: { [key: string]: string };
  labels: string[]
  description: string;
  createdOn: Timestamp;
  updatedOn: Timestamp;
}

export interface TranslationCreate {
  type: TranslationType;
  locales: { [key: string]: string };
  labels: string[]
  description: string;
}

export interface TranslationUpdate {
  labels: string[]
  description: string;
}
