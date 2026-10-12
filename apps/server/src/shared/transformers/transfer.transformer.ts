import type { TranslationExport } from '@localess/shared';
import type { translations } from '../../infra/database/schema.js';

/*
 * Rows → the entries of export files (translations.json), the shapes the Firebase
 * version wrote; the export tasks write them and the import tasks read them back.
 */

export function translationToExport(row: typeof translations.$inferSelect): TranslationExport {
  // Export files identify a translation by its key, carried as `id`.
  const exported: TranslationExport = { id: row.key, type: row.type as TranslationExport['type'], locales: row.locales };
  if (row.labels?.length) exported.labels = row.labels;
  if (row.description) exported.description = row.description;
  return exported;
}
