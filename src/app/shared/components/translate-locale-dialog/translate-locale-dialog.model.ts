import { Locale } from '@shared/models/locale.model';

export interface TranslateLocaleDialogModel {
  locales: Locale[];
  description?: string;
}

export type TranslateLocaleDialogReturn = {
  sourceLocale: string;
  targetLocale: string;
  /** Replace translations that already have a value instead of filling only the empty ones. */
  overwrite: boolean;
};
