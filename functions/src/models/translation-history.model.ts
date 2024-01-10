import { Timestamp } from 'firebase-admin/firestore';

export enum TranslationHistoryType {
  PUBLISHED = 'PUBLISHED',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface TranslationHistory {
  type: TranslationHistoryType;
  description?: string;
  key?: string;
  name?: string;
  email?: string;
  createdAt: Timestamp;
}
