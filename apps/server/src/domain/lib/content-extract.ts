import { ContentData, ContentDocumentStorage, ContentKind, extractContent, Schema } from '@localess/shared';

/*
 * The per-locale document the public API serves. The locale extraction itself (`extractContent`) is in
 * @localess/shared, so the editor's preview runs the same code. Ported from the body of
 * `buildDocumentStorageForLocales` in functions/src/contents.ts, which wrote it to Storage on publish
 * (published) and on every save (draft).
 * Drafts are now built from `contents.data` on read; published snapshots live in `content_published`.
 */

/** What `buildDocumentStorage` reads from a `contents` row. */
export interface StorableDocument {
  id: string;
  name: string;
  slug: string;
  parentSlug: string;
  fullSlug: string;
  /** Firestore stored it as an object or a JSON string; both are accepted. */
  data?: ContentData | Record<string, unknown> | string | null;
  assets?: string[] | null;
  links?: string[] | null;
  references?: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

/** One locale of a document in its stored (pre-resolution) shape; `publishedAt` only for published snapshots. */
export function buildDocumentStorage(
  document: StorableDocument,
  schemas: Map<string, Schema>,
  locale: string,
  publishedAt?: string,
): ContentDocumentStorage {
  const documentStorage: ContentDocumentStorage = {
    id: document.id,
    name: document.name,
    kind: ContentKind.DOCUMENT,
    locale,
    slug: document.slug,
    fullSlug: document.fullSlug,
    parentSlug: document.parentSlug,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
  if (publishedAt) {
    documentStorage.publishedAt = publishedAt;
  }
  if (document.data) {
    const data = (typeof document.data === 'string' ? JSON.parse(document.data) : document.data) as ContentData;
    documentStorage.data = extractContent(data, schemas, locale);
  }
  if (document.assets && document.assets.length > 0) {
    documentStorage.assets = document.assets;
  }
  if (document.links && document.links.length > 0) {
    documentStorage.links = document.links;
  }
  if (document.references && document.references.length > 0) {
    documentStorage.references = document.references;
  }
  return documentStorage;
}
