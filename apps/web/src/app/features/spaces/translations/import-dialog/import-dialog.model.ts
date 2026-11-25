import { Locale } from '@localess/shared';

export interface ImportDialogContext {
  locales: Locale[];
}

/** The file; with a locale for a key-value JSON (a `.localess.zip` says what it holds). */
export interface ImportDialogResult {
  file: File;
  locale?: string;
}
