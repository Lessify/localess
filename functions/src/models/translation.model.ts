import { Timestamp } from 'firebase-admin/firestore';
import { zTranslationUpdateSchema } from './translation.zod';
import { z } from 'zod';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY',
}

export interface Translation {
  type: TranslationType;
  locales: Record<string, string>;
  labels?: string[];
  description?: string;
  updatedBy?: {
    name: string;
    email: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublishTranslationsData {
  spaceId: string;
}

// Import and Export
export interface TranslationExport extends Omit<Translation, 'createdAt' | 'updatedAt'> {
  id: string;
}

export type TranslationUpdate = z.infer<typeof zTranslationUpdateSchema>;

export interface TranslationUpdateCounts {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

export interface TranslationUpdateIds {
  created: string[];
  updated: string[];
  deleted: string[];
}

export interface TranslationUpdateResponse {
  message: string;
  counts: TranslationUpdateCounts;
  ids: TranslationUpdateIds;
  dryRun?: boolean;
}

export interface TranslateLocaleData {
  spaceId: string;
  sourceLocaleId: string;
  targetLocaleId: string;
}
