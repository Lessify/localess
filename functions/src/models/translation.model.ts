import { Timestamp } from 'firebase-admin/firestore';

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
