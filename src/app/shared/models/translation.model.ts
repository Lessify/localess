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
  locales: { [key: string]: string }
  labels?: string[]
  description?: string
  autoTranslate?: boolean
  createdOn: Timestamp
  updatedOn: Timestamp
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
  locales: { [key: string]: string }
  labels?: string[]
  description?: string
  autoTranslate?: boolean
  createdOn: FieldValue
  updatedOn: FieldValue
}

export interface TranslationUpdate {
  labels: string[]
  description: string
}

export interface TranslationUpdateFS {
  labels: string[]
  description: string
  updatedOn: FieldValue
}

export type TranslationLocale = { [key: string]: string }

export interface TranslationExportImport {
  name: string
  locales: { [key: string]: string }
  labels?: string[]
  description?: string
}

export interface TranslationsExportFlatData {
  kind: 'FLAT'
  spaceId: string
  locale: string
  /**
   * number of milliseconds.
   */
  fromDate?: number
}

export interface TranslationsExportFullData {
  kind: 'FULL'
  spaceId: string
  /**
   * number of milliseconds.
   */
  fromDate?: number
}

export type TranslationsExportData = TranslationsExportFlatData | TranslationsExportFullData

export interface TranslationsImportFlatData {
  kind: 'FLAT'
  spaceId: string
  locale: string
  translations: TranslationLocale
  onlyNewKeys?: boolean
}

export interface TranslationsImportFullData {
  kind: 'FULL'
  spaceId: string
  translations: TranslationExportImport[]
  onlyNewKeys?: boolean
}

export type TranslationsImportData = TranslationsImportFlatData | TranslationsImportFullData
