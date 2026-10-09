import { Locale } from '@localess/shared';

export interface LocaleDialogContext {
  locales?: Locale[];
}

export interface LocaleDialogResult {
  locale: Locale;
}
