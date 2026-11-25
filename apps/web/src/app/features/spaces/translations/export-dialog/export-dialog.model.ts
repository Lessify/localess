import { Locale } from '@localess/shared';

export interface ExportDialogContext {
  locales: Locale[];
}

/** Every translation as a `.localess.zip` (a task), or one locale as key-value JSON (a direct download). */
export type ExportDialogResult = { kind: 'FULL' } | { kind: 'LOCALE'; locale: string };
