import type { SchemaComponentExport, SchemaEnumExport } from './schema.model.js';

// The `.localess.zip` file of the platform exports: `manifest.json` first, then the entities as JSON Lines
// (`translations.jsonl`, `schemas.jsonl`), streamed both ways. Validators: localess-file.zod.ts.

export const LOCALESS_FILE_FORMAT = 'localess';
export const LOCALESS_FILE_VERSION = 1;
export const LOCALESS_FILE_EXTENSION = '.localess.zip';

/** What a `.localess.zip` holds. */
export type LocalessFileKind = 'TRANSLATION' | 'SCHEMA';

export interface LocalessManifest {
  format: typeof LOCALESS_FILE_FORMAT;
  version: typeof LOCALESS_FILE_VERSION;
  kind: LocalessFileKind;
  exportedAt: string;
  source: { spaceId: string; spaceName: string; locales: string[] };
  /** How many lines the entry holds. */
  count: number;
}

/** One line of `translations.jsonl`. */
export interface TranslationLine {
  key: string;
  locales: Record<string, string>;
  description?: string;
  labels?: string[];
}

/** One line of `schemas.jsonl`: a schema identified by its name (no database id; relations use names too). */
export type SchemaLine = (Omit<SchemaComponentExport, 'id'> & { name: string }) | (Omit<SchemaEnumExport, 'id'> & { name: string });
