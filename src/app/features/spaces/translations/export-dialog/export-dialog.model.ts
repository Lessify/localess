import { Locale } from '@shared/models/locale.model';

export interface ExportDialogModel {
  locales: Locale[];
}

export type ExportDialogReturn = ExportFullDialogReturn | ExportFlatDialogReturn;

export interface ExportFullDialogReturn {
  kind: 'FULL';
}

export interface ExportFlatDialogReturn {
  kind: 'FLAT';
  locale: string;
}
