import { Timestamp } from '@angular/fire/firestore';

export enum TranslationHistoryType {
  PUBLISHED = 'PUBLISHED',
}

export interface TranslationHistory {
  id: string;
  type: TranslationHistoryType;
  description?: string;
  name?: string;
  email?: string;
  createdAt: Timestamp;
}
