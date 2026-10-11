import type { AssetExport, ContentExport, TranslationExport } from '@localess/shared';
import type { assets, contents, translations } from '../../infra/database/schema.js';
import { withoutNulls } from '../../infra/database/without-nulls.js';

/*
 * Rows → the entries of export files (assets.json, contents.json, translations.json), the shapes the Firebase
 * version wrote; the export tasks write them and the import tasks read them back.
 */

export function assetToExport(row: typeof assets.$inferSelect): AssetExport {
  const asset = withoutNulls(row);
  if (asset.kind === 'FOLDER') return { id: asset.id, kind: 'FOLDER', name: asset.name, parentPath: asset.parentPath } as AssetExport;
  return {
    id: asset.id,
    kind: 'FILE',
    name: asset.name,
    parentPath: asset.parentPath,
    extension: asset.extension,
    type: asset.type,
    size: asset.size,
    alt: asset.alt,
    metadata: asset.metadata,
    source: asset.source,
  } as AssetExport;
}

export function contentToExport(row: typeof contents.$inferSelect): ContentExport {
  const base = { id: row.id, kind: row.kind, name: row.name, slug: row.slug, parentSlug: row.parentSlug, fullSlug: row.fullSlug };
  if (row.kind === 'FOLDER') return base as ContentExport;
  return { ...base, schema: row.schema ?? undefined, data: row.data ?? undefined } as ContentExport;
}

export function translationToExport(row: typeof translations.$inferSelect): TranslationExport {
  // Export files identify a translation by its key, carried as `id`.
  const exported: TranslationExport = { id: row.key, type: row.type as TranslationExport['type'], locales: row.locales };
  if (row.labels?.length) exported.labels = row.labels;
  if (row.description) exported.description = row.description;
  return exported;
}
