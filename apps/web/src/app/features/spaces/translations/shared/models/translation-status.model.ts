// UI-only translation filters; the translation model itself is in @localess/shared.

export enum TranslationStatus {
  TRANSLATED = 'TRANSLATION_TRANSLATED',
  PARTIALLY_TRANSLATED = 'TRANSLATION_PARTIALLY_TRANSLATED',
  UNTRANSLATED = 'TRANSLATION_UNTRANSLATED',
}

/** How a status is named in the UI: the filter, the status icon's tooltip and the detail panel. */
export const TRANSLATION_STATUS_LABELS: Record<TranslationStatus, string> = {
  [TranslationStatus.TRANSLATED]: 'Translated',
  [TranslationStatus.PARTIALLY_TRANSLATED]: 'Partially Translated',
  [TranslationStatus.UNTRANSLATED]: 'Untranslated',
};

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
