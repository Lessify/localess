import {Timestamp} from 'firebase-admin/firestore';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export interface Translation {
  name: string
  type: TranslationType
  locales: Record<string, string>
  labels?: string[]
  autoTranslate?: boolean
  description?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface TranslationExportImport {
  name: string;
  locales: Record<string, string>;
  labels?: string[]
  description?: string;
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
  translations: Record<string, string>
  onlyNewKeys?: boolean
}

export interface TranslationsImportFullData {
  kind: 'FULL'
  spaceId: string
  translations: TranslationExportImport[]
  onlyNewKeys?: boolean
}

export type TranslationsImportData = TranslationsImportFlatData | TranslationsImportFullData

export interface PublishTranslationsData {
  spaceId: string
}
