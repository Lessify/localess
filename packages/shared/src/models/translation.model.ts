import type { z } from 'zod';

import type { Timestamp } from './timestamp.js';
import type { zTranslationManageUpdateSchema } from './translation.zod.js';

export enum TranslationType {
  STRING = 'STRING',
  PLURAL = 'PLURAL',
  ARRAY = 'ARRAY',
}

export interface Translation {
  /** Row id (UUIDv7), used by the App API only. */
  id: string;
  /** The translation key, unique per space: what the public API, the SDK, the CLI and export files use. */
  key: string;
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

// Import and Export: a translation is identified by its key, carried as `id`; the row UUID never leaves the App API.
export type TranslationExport = Omit<Translation, 'id' | 'key' | 'createdAt' | 'updatedAt' | 'updatedBy'> & { /** The key. */ id: string };

// App API requests
export interface TranslationCreate {
  key: string;
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
  /** Translation keys the request's `type` wrote (or, on a dry run, would write). */
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
