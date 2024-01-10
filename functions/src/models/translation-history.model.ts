import { Timestamp } from 'firebase-admin/firestore';

export enum TranslationHistoryType {
  PUBLISHED = 'PUBLISHED',
}

export interface TranslationHistory {
  type: TranslationHistoryType;
  description?: string;
  name?: string;
  email?: string;
  createdAt: Timestamp;
}
