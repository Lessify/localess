import { Locale } from '@localess/shared';

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
