import {Locale} from '@shared/models/locale.model';
import {TranslationExportImport, TranslationLocale} from '@shared/models/translation.model';

export interface TranslationImportDialogModel {
  locales: Locale[]
}

export type TranslationImportDialogReturn = TranslationImportFullDialogReturn | TranslationImportFlatDialogReturn

export interface TranslationImportFullDialogReturn {
  kind: 'FULL'
  translations: TranslationExportImport[]
}

export interface TranslationImportFlatDialogReturn {
  kind: 'FLAT'
  locale: string
  translations: TranslationLocale
}
