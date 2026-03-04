import { Locale } from '@shared/models/locale.model';

export interface LocaleTranslateDialogModel {
  locales: Locale[];
}

export type LocaleTranslateDialogReturn = {
  sourceLocale: string;
  targetLocale: string;
};
