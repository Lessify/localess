import { Locale } from '@shared/models/locale.model';

export interface TranslateLocaleDialogModel {
  locales: Locale[];
  /**
   * The space's fallback locale. Required from the content side, where `locales` carries the
   * `default` sentinel instead of the fallback's real language and the dialog cannot otherwise
   * tell whether the provider supports it.
   */
  localeFallback?: Locale;
  description?: string;
}

export type TranslateLocaleDialogReturn = {
  sourceLocale: string;
  targetLocale: string;
  /** Replace translations that already have a value instead of filling only the empty ones. */
  overwrite: boolean;
};
