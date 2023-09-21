import { Timestamp } from 'firebase-admin/firestore';
import { JSONSchemaType } from 'ajv';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY',
}

export interface Translation {
  name: string;
  type: TranslationType;
  locales: Record<string, string>;
  labels?: string[];
  autoTranslate?: boolean;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublishTranslationsData {
  spaceId: string;
}

// Import and Export
export interface TranslationExport extends Omit<Translation, 'autoTranslate' | 'createdAt' | 'updatedAt'> {
  id: string;
}

export const translationExportArraySchema: JSONSchemaType<TranslationExport[]> = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'string', nullable: false },
      name: { type: 'string', nullable: false },
      type: { type: 'string', enum: Object.values(TranslationType), nullable: false },
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
        items: { type: 'string', nullable: true },
      },
      description: { type: 'string', nullable: true },
    },
    required: ['name', 'type', 'locales'],
    additionalProperties: false,
  },
};

export const translationFlatExportSchema: JSONSchemaType<Record<string, string>> = {
  type: 'object',
  minProperties: 1,
  required: [],
};
