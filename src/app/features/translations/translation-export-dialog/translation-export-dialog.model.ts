import {Locale} from '@shared/models/locale.model';

export interface TranslationExportDialogModel {
  locales: Locale[]
}

export type TranslationExportDialogReturn = TranslationExportFullDialogReturn | TranslationExportFlatDialogReturn

export interface TranslationExportFullDialogReturn {
  kind: 'FULL'
}

export interface TranslationExportFlatDialogReturn {
  kind: 'FLAT'
  locale: string
}
