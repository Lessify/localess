import { Locale } from '@shared/models/locale.model';

export interface LocaleDialogContext {
  locales?: Locale[];
}

export interface LocaleDialogResult {
  locale: Locale;
}
