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

/** What the translation list sorts by: the key (the default), when created, when last changed. */
export const TRANSLATION_SORT_FIELDS = ['key', 'createdAt', 'updatedAt'] as const;
export type TranslationSortField = (typeof TRANSLATION_SORT_FIELDS)[number];

/** A key's status across the space's locales: a value in every one, in some, in none. */
export const TRANSLATION_STATUSES = ['TRANSLATED', 'PARTIALLY_TRANSLATED', 'UNTRANSLATED'] as const;
export type TranslationStatusFilter = (typeof TRANSLATION_STATUSES)[number];

/** A key's status in one locale (`?locale=`): a non-blank value, or none. */
export const LOCALE_STATUSES = ['TRANSLATED', 'UNTRANSLATED'] as const;
export type LocaleStatusFilter = (typeof LOCALE_STATUSES)[number];

/**
 * One node of the translation tree, which `.` in the keys makes (`home.hero.title` → home › hero › title). The tree has no
 * rows of its own: `GET …/translations/nodes?parent=` resolves one level of it, from the keys that match the filter.
 */
export interface TranslationNode {
  /** The segment: `title`. */
  name: string;
  /** The key up to and with this segment: `home.hero.title`. */
  path: string;
  /** The translation whose key is exactly `path`; a node can be a key and a group (`home` and `home.title`). */
  translation?: Translation;
  /** How many matching keys lie below; 0: no group, nothing to expand. */
  children: number;
}

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
