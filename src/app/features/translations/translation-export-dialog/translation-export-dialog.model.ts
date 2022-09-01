import {Locale} from '../../../shared/models/locale.model';
import {TranslationsExportImportType} from '../../../shared/models/translation.model';

export interface TranslationExportDialogModel {
  locales: Locale[]
}

export interface TranslationExportDialogReturn {
  type: TranslationsExportImportType
  locale?: string
}
