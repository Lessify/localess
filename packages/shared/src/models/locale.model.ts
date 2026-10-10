export interface Locale {
  id: string;
  name: string;
}

/** Default locale of a new space. */
export const DEFAULT_LOCALE: Locale = { id: 'en', name: 'English' };

/**
 * Storage sentinel for content: values of the default locale live under the bare field name, every
 * other locale under `{field}_i18n_{locale}`. It stands for the space's `defaultLocale`.
 */
export const CONTENT_DEFAULT_LOCALE: Locale = { id: 'default', name: 'Default' };
