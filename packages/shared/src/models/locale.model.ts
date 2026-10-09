export interface Locale {
  id: string;
  name: string;
}

/** Locale of a new space, and the fallback when a space has none. */
export const DEFAULT_LOCALE: Locale = { id: 'en', name: 'English' };

/**
 * Storage sentinel for content: values of the default locale live under the bare field name, every
 * other locale under `{field}_i18n_{locale}`. It stands for the space's `localeFallback`.
 */
export const CONTENT_DEFAULT_LOCALE: Locale = { id: 'default', name: 'Default' };
