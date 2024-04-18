import { FieldValue, Timestamp } from '@angular/fire/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY',
}

export enum TranslationStatus {
  TRANSLATED = 'TRANSLATED',
  PARTIALLY_TRANSLATED = 'PARTIALLY_TRANSLATED',
  UNTRANSLATED = 'UNTRANSLATED',
}

export interface Translation {
  id: string;
  type: TranslationType;
  locales: Record<string, string>;
  labels?: string[];
  description?: string;
  autoTranslate?: boolean;
  updatedBy?: {
    name: string;
    email: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TranslationCreate {
  id: string;
  type: TranslationType;
  labels?: string[];
  description?: string;
  locale: string;
  value: string;
  autoTranslate?: boolean;
}

export interface TranslationCreateFS {
  type: TranslationType;
  locales: Record<string, string>;
  labels?: string[];
  description?: string;
  autoTranslate?: boolean;
  updatedBy?: {
    name: string;
    email: string;
  };
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface TranslationUpdate {
  labels: string[];
  description: string;
}
