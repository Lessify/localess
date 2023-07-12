import {Locale} from '@shared/models/locale.model';

export interface ExportDialogModel {
  locales: Locale[]
}

export type ExportDialogReturn = ExportFullDialogReturn | ExportFlatDialogReturn

export interface ExportFullDialogReturn {
  kind: 'FULL'
  /**
   * number of milliseconds.
   */
  fromDate?: number
}

export interface ExportFlatDialogReturn {
  kind: 'FLAT'
  locale: string
  /**
   * number of milliseconds.
   */
  fromDate?: number
}
