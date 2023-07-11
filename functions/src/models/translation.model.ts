import {Timestamp} from 'firebase-admin/firestore';
import {JSONSchemaType} from 'ajv';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY'
}

export interface Translation {
  id: string
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

// Import and Export
export type TranslationExport = Omit<Translation, 'autoTranslate' | 'createdAt' | 'updatedAt'>

export const translationExportArraySchema: JSONSchemaType<TranslationExport[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: {type: 'string', nullable: false},
      name: {type: 'string', nullable: false},
      type: {type: 'string', enum: Object.values(TranslationType), nullable: false},
      locales: {
        type: 'object',
        nullable: false,
        minProperties: 1,
        additionalProperties: true,
        required: [],
      },
      labels: {
        type: 'array',
        nullable: true,
        items: {type: 'string', nullable: true},
      },
      description: {type: 'string', nullable: true},
    },
    required: ['name', 'type', 'locales'],
    additionalProperties: false,
  },
};
