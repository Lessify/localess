import type { z } from 'zod';

import type { Timestamp } from './timestamp.js';
import type { zTranslationManageUpdateSchema } from './translation.zod.js';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY',
}

export interface Translation {
  id: string;
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
export type TranslationExport = Omit<Translation, 'createdAt' | 'updatedAt'>;

// App API requests
export interface TranslationCreate {
  id: string;
  type: TranslationType;
  labels?: string[];
  description?: string;
  locales: Record<string, string>;
}

export interface TranslationUpdate {
  labels: string[];
  description: string;
}

/** Body of the public MANAGE API `POST /api/v1/spaces/{spaceId}/translations/{locale}`. */
export type TranslationManageUpdate = z.infer<typeof zTranslationManageUpdateSchema>;

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
