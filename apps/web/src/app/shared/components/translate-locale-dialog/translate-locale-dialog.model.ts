import { Locale } from '@localess/shared';

/**
 * What happens to the translation, which the dialog says before the author starts it: `save` writes every translation
 * of the space at once (the Translations task, no undo), `review` fills the open document's form and saves nothing.
 */
export type TranslateLocaleDialogMode = 'save' | 'review';

export interface TranslateLocaleDialogContext {
  mode: TranslateLocaleDialogMode;
  locales: Locale[];
  /**
   * The space's default locale, preselected as the source. Required from the content side, where
   * `locales` carries the `default` sentinel instead of the fallback's real language and the dialog
   * cannot otherwise tell whether the provider supports it.
   */
  defaultLocale?: Locale;
  /**
   * The locale the caller is currently showing, if it has one - the locale the document is open in,
   * or the one the Translations list shows. It is preselected as the target, because translating into the locale
   * you are looking at is the reason the dialog is opened, and marked in both lists so it is clear
   * which one that is.
   */
  selectedLocale?: string;
}

export type TranslateLocaleDialogResult = {
  sourceLocale: string;
  targetLocale: string;
  /** Replace translations that already have a value instead of filling only the empty ones. */
  overwrite: boolean;
};
