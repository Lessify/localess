import type { Timestamp } from './timestamp.js';

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

// Import and Export: a translation is identified by its key, carried as `id`; the row UUID never leaves the App API.
export type TranslationExport = Omit<Translation, 'id' | 'key' | 'createdAt' | 'updatedAt'> & { /** The key. */ id: string };

// App API requests: translation.zod.ts

/** `POST …/translations/translate-locale`: keys written, and keys the provider failed on (left unchanged). */
export interface TranslateLocaleResult {
  translated: number;
  failed: number;
}

export interface TranslationUpdateResponse {
  message: string;
  /** Translation keys the request's `type` wrote (or, on a dry run, would write). */
  ids: string[];
  dryRun?: boolean;
}
