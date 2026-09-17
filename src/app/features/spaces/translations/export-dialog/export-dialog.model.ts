import { Locale } from '@shared/models/locale.model';

export interface ExportDialogContext {
  locales: Locale[];
}

export type ExportDialogResult = ExportFullDialogResult | ExportFlatDialogResult;

export interface ExportFullDialogResult {
  kind: 'FULL';
}

export interface ExportFlatDialogResult {
  kind: 'FLAT';
  locale: string;
}
