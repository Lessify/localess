import { Locale } from '@shared/models/locale.model';

export interface TranslateLocaleDialogContext {
  locales: Locale[];
  /**
   * The space's fallback locale. Required from the content side, where `locales` carries the
   * `default` sentinel instead of the fallback's real language and the dialog cannot otherwise
   * tell whether the provider supports it.
   */
  localeFallback?: Locale;
  /**
   * The locale the caller is currently showing, if it has one - the content side passes the locale
   * the document is open in. It is preselected as the target, because translating into the locale
   * you are looking at is the reason the dialog is opened, and marked in both lists so it is clear
   * which one that is.
   */
  selectedLocale?: string;
  description?: string;
}

export type TranslateLocaleDialogResult = {
  sourceLocale: string;
  targetLocale: string;
  /** Replace translations that already have a value instead of filling only the empty ones. */
  overwrite: boolean;
};
