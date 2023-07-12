import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export enum TranslationStatus {
  TRANSLATED = 'TRANSLATED',
  PARTIALLY_TRANSLATED = 'PARTIALLY_TRANSLATED',
  UNTRANSLATED = 'UNTRANSLATED'
}

export interface Translation {
  id: string
  name: string
  type: TranslationType
  locales: Record<string, string>
  labels?: string[]
  description?: string
  autoTranslate?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TranslationCreate {
  name: string
  type: TranslationType
  labels?: string[]
  description?: string
  locale: string
  value: string
  autoTranslate?: boolean
}

export interface TranslationCreateFS {
  name: string
  type: TranslationType
  locales: Record<string, string>
  labels?: string[]
  description?: string
  autoTranslate?: boolean
  createdAt: FieldValue
  updatedAt: FieldValue
}

export interface TranslationUpdate {
  labels: string[]
  description: string
}

export interface TranslationUpdateFS {
  labels: string[]
  description: string
  updatedAt: FieldValue
}
