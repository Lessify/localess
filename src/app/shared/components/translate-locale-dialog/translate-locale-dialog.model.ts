import { Locale } from '@shared/models/locale.model';

export interface TranslateLocaleDialogModel {
  locales: Locale[];
}

export type TranslateLocaleDialogReturn = {
  sourceLocale: string;
  targetLocale: string;
};
