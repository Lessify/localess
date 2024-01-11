import { Timestamp } from '@angular/fire/firestore';

export enum TranslationHistoryType {
  PUBLISHED = 'PUBLISHED',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export type TranslationHistory = TranslationHistoryPublish | TranslationHistoryCreate | TranslationHistoryUpdate | TranslationHistoryDelete;

export interface TranslationHistoryBase {
  type: TranslationHistoryType;
  createdAt: Timestamp;
}

export interface TranslationHistoryPublish extends TranslationHistoryBase {
  type: TranslationHistoryType.PUBLISHED;
  name?: string;
  email?: string;
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
