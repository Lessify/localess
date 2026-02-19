import { FieldValue, Timestamp } from '@angular/fire/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY',
}

export enum TranslationStatus {
  TRANSLATED = 'TRANSLATION_TRANSLATED',
  PARTIALLY_TRANSLATED = 'TRANSLATION_PARTIALLY_TRANSLATED',
  UNTRANSLATED = 'TRANSLATION_UNTRANSLATED',
}

export function isTranslationStatus(value: string): value is TranslationStatus {
  return Object.values(TranslationStatus).includes(value as TranslationStatus);
}

export enum LocaleStatus {
  TRANSLATED = 'LOCALE_TRANSLATED',
  UNTRANSLATED = 'LOCALE_UNTRANSLATED',
}

export function isLocaleStatus(value: string): value is LocaleStatus {
  return Object.values(LocaleStatus).includes(value as LocaleStatus);
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
