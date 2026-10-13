import type { z } from 'zod';

import type { Timestamp } from './timestamp.js';
import type { zTranslationManageUpdateSchema } from './translation.zod.js';

/**
 * A translation key: a letter first, then letters, digits, `-`, `_` or `.`, ending in a letter or digit (the nested
 * JSON format splits keys on `.`). Checked where a key is created or renamed; keys imported from Firebase are kept as
 * they are.
 */
export const TRANSLATION_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_.-]*[a-zA-Z0-9]$/;
export const TRANSLATION_KEY_MAX_LENGTH = 150;
/** The longest value of one locale, on every write. */
export const TRANSLATION_VALUE_MAX_LENGTH = 10_000;

export function isTranslationKey(key: string): boolean {
  return key.length <= TRANSLATION_KEY_MAX_LENGTH && TRANSLATION_KEY_PATTERN.test(key);
}

export interface Translation {
  /** Row id (UUIDv7), used by the App API only. */
  id: string;
  /** The translation key, unique per space: what the public API, the SDK, the CLI and export files use. */
  key: string;
  /** Plain text per locale. */
  locales: Record<string, string>;
  labels?: string[];
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PublishTranslationsData {
  spaceId: string;
}

// Import and Export: a translation is identified by its key, carried as `id`; the row UUID never leaves the App API.
export type TranslationExport = Omit<Translation, 'id' | 'key' | 'createdAt' | 'updatedAt'> & { /** The key. */ id: string };

// App API requests
export interface TranslationCreate {
  key: string;
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
