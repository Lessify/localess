import {Timestamp} from 'firebase-admin/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export interface Translation {
  name: string;
  type: TranslationType;
  locales: { [key: string]: string };
  labels: string[]
  description: string;
  createdOn: Timestamp;
  updatedOn: Timestamp;
}
