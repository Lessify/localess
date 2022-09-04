import {Locale} from '@shared/models/locale.model';

export interface TranslationExportDialogModel {
  locales: Locale[]
}

export type TranslationExportDialogReturn = TranslationExportFullDialogReturn | TranslationExportFlatDialogReturn

export interface TranslationExportFullDialogReturn {
  kind: 'FULL'
  /**
   * number of milliseconds.
   */
  fromDate?: number
}

export interface TranslationExportFlatDialogReturn {
  kind: 'FLAT'
  locale: string
  /**
   * number of milliseconds.
   */
  fromDate?: number
}
