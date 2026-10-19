import type { TranslationExport } from '@localess/shared';
import type { TranslationEntity } from '../entities/translation.entity.js';

/*
 * Rows → the entries of export files (translations.json), the shapes the Firebase
 * version wrote; the export tasks write them and the import tasks read them back.
 */

export function translationToExport(row: TranslationEntity): TranslationExport {
  // Export files identify a translation by its key, carried as `id`.
  const exported: TranslationExport = { id: row.key, locales: row.locales };
  if (row.labels?.length) exported.labels = row.labels;
  if (row.description) exported.description = row.description;
  return exported;
}
