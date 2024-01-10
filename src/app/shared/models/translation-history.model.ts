import { Timestamp } from '@angular/fire/firestore';

export enum TranslationHistoryType {
  PUBLISHED = 'PUBLISHED',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export interface TranslationHistory {
  id: string;
  type: TranslationHistoryType;
  description?: string;
  key?: string;
  name?: string;
  email?: string;
  createdAt: Timestamp;
}
