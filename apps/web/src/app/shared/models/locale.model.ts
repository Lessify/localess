export interface Locale {
  id: string;
  name: string;
}

export const CONTENT_DEFAULT_LOCALE: Locale = { id: 'default', name: 'Default' };
export const TRANSLATION_DEFAULT_LOCALE: Locale = { id: 'en', name: 'English' };

/**
 * Resolves a locale id chosen in the UI to the language code a translation provider understands.
 *
 * `default` is a storage sentinel, not a language: content for the default locale lives under the
 * bare field name while every other locale is suffixed `_i18n_<locale>`. The locale it stands for
 * is the space's fallback, and the locale picker even labels it that way ("English (Default)"), so
 * the real code is known and worth sending - the provider is told the source language instead of
 * guessing it, and a translation *into* the default locale asks for a language that exists.
 *
 * A space always has a fallback locale, so the sentinel is always resolvable in practice. If it is
 * not, the raw id is returned rather than a guess: the provider rejects `default` as a language,
 * which surfaces the missing space instead of quietly translating from the wrong one.
 * @param localeId locale id as selected in the UI
 * @param fallbackLocaleId the space's `localeFallback` id
 */
export function toProviderLocale(localeId: string, fallbackLocaleId: string | undefined): string {
  return localeId === CONTENT_DEFAULT_LOCALE.id ? (fallbackLocaleId ?? localeId) : localeId;
}
