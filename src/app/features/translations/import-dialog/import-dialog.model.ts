import {Locale} from '@shared/models/locale.model';

export interface ImportDialogModel {
  locales: Locale[]
}

export type ImportDialogReturn = ImportFullDialogReturn | ImportFlatDialogReturn

export interface ImportFullDialogReturn {
  kind: 'FULL'
  file: File
}

export interface ImportFlatDialogReturn {
  kind: 'FLAT'
  locale: string
  file: File
}
