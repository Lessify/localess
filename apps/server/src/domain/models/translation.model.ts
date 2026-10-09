import type { Timestamp } from './timestamp.js';
import { zTranslationUpdateSchema } from './translation.zod.js';
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

export interface TranslationUpdateResponse {
  message: string;
  /** Translation ids the request's `type` wrote (or, on a dry run, would write). */
  ids: string[];
  dryRun?: boolean;
}

export interface TranslateLocaleData {
  spaceId: string;
  sourceLocaleId: string;
  targetLocaleId: string;
  /** Replace target values that already exist instead of filling only the empty ones. */
  overwrite?: boolean;
}
