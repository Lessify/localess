// UI-only translation filters; the translation model itself is in @localess/shared.

export enum TranslationStatus {
  TRANSLATED = 'TRANSLATION_TRANSLATED',
  PARTIALLY_TRANSLATED = 'TRANSLATION_PARTIALLY_TRANSLATED',
  UNTRANSLATED = 'TRANSLATION_UNTRANSLATED',
}

export function isTranslationStatus(value: string): value is TranslationStatus {
  return Object.values(TranslationStatus).includes(value as TranslationStatus);
}

export enum LocaleStatus {
  TRANSLATED = 'LOCALE_TRANSLATED',
  UNTRANSLATED = 'LOCALE_UNTRANSLATED',
}

export function isLocaleStatus(value: string): value is LocaleStatus {
  return Object.values(LocaleStatus).includes(value as LocaleStatus);
}
