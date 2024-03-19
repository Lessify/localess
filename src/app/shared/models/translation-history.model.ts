import { Timestamp } from '@angular/fire/firestore';

export enum TranslationHistoryType {
  PUBLISHED = 'PUBLISHED',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export type TranslationHistory = TranslationHistoryPublish | TranslationHistoryCreate | TranslationHistoryUpdate | TranslationHistoryDelete;

export interface TranslationHistoryBase {
  id: string;
  type: TranslationHistoryType;
  createdAt: Timestamp;
  name?: string;
  email?: string;
}

export interface TranslationHistoryPublish extends TranslationHistoryBase {
  type: TranslationHistoryType.PUBLISHED;
}

export interface TranslationHistoryCreate extends TranslationHistoryBase {
  type: TranslationHistoryType.CREATE;
  key: string;
}

export interface TranslationHistoryUpdate extends TranslationHistoryBase {
  type: TranslationHistoryType.UPDATE;
  key: string;
}

export interface TranslationHistoryDelete extends TranslationHistoryBase {
  type: TranslationHistoryType.DELETE;
  key: string;
}
