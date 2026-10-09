import {
  Asset,
  AssetExport,
  AssetFile,
  AssetFileExport,
  AssetFileMetadata,
  AssetKind,
  Content,
  ContentDocument,
  ContentDocumentExport,
  ContentExport,
  ContentKind,
  Translation,
  TranslationExport,
} from '@localess/shared';
import { isLabelsEqual } from './import-utils.js';

/*
 * "Did the imported item change?" — moved unchanged from functions/src/services/{asset,content,translation}.service.ts.
 * Imports only write items for which these return true.
 */

/** Two metadata objects are equal when format, width and height match. */
export function isAssetMetadataEqual(a?: AssetFileMetadata, b?: AssetFileMetadata): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const x = a as { format?: string; width?: number; height?: number };
  const y = b as { format?: string; width?: number; height?: number };
  return x.format === y.format && x.width === y.width && x.height === y.height;
}

export function isAssetChanged(existing: Asset, imported: AssetExport): boolean {
  if (existing.name !== imported.name) return true;
  if (existing.parentPath !== imported.parentPath) return true;
  if (existing.kind !== imported.kind) return true;
  if (existing.kind === AssetKind.FILE && imported.kind === AssetKind.FILE) {
    const e = existing as AssetFile;
    const i = imported as AssetFileExport;
    if (e.extension !== i.extension) return true;
    if (e.type !== i.type) return true;
    if (e.size !== i.size) return true;
    if ((e.alt ?? undefined) !== (i.alt ?? undefined)) return true;
    if ((e.source ?? undefined) !== (i.source ?? undefined)) return true;
    if (!isAssetMetadataEqual(e.metadata, i.metadata)) return true;
  }
  return false;
}

export function isContentChanged(existing: Content, imported: ContentExport): boolean {
  if (existing.kind !== imported.kind) return true;
  if (existing.name !== imported.name) return true;
  if (existing.slug !== imported.slug) return true;
  if (existing.parentSlug !== imported.parentSlug) return true;
  if (existing.fullSlug !== imported.fullSlug) return true;
  if (existing.kind === ContentKind.DOCUMENT && imported.kind === ContentKind.DOCUMENT) {
    const e = existing as ContentDocument;
    const i = imported as ContentDocumentExport;
    if (e.schema !== i.schema) return true;
    if (JSON.stringify(e.data ?? null) !== JSON.stringify(i.data ?? null)) return true;
    if (JSON.stringify(e.assets ?? []) !== JSON.stringify(i.assets ?? [])) return true;
    if (JSON.stringify(e.links ?? []) !== JSON.stringify(i.links ?? [])) return true;
    if (JSON.stringify(e.references ?? []) !== JSON.stringify(i.references ?? [])) return true;
  }
  return false;
}

export function isLocalesEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => a[k] === b[k]);
}

export function isTranslationChanged(existing: Translation, imported: TranslationExport): boolean {
  if (existing.type !== imported.type) return true;
  if (!isLocalesEqual(existing.locales, imported.locales)) return true;
  if ((existing.description ?? undefined) !== (imported.description ?? undefined)) return true;
  if (!isLabelsEqual(existing.labels, imported.labels)) return true;
  return false;
}
