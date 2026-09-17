import { Locale } from '@shared/models/locale.model';

export interface ImportDialogContext {
  locales: Locale[];
}

export type ImportDialogResult = ImportFullDialogResult | ImportFlatDialogResult;

export interface ImportFullDialogResult {
  kind: 'FULL';
  file: File;
}

export interface ImportFlatDialogResult {
  kind: 'FLAT';
  locale: string;
  file: File;
}
