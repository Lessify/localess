import {
  ContentData,
  ContentDocumentStorage,
  ContentKind,
  isFieldTranslatable,
  Schema,
  SchemaFieldKind,
  SchemaType,
} from '../models/index.js';

/*
 * The per-locale document the public API serves. Ported from functions/src/services/content.service.ts
 * (`contentSchemaId`, `extractContent`) and the body of `buildDocumentStorageForLocales` in
 * functions/src/contents.ts, which wrote it to Storage on publish (published) and on every save (draft).
 * Drafts are now built from `contents.data` on read; published snapshots live in `content_published`.
 */

/**
 * Schema id of a stored block. Blocks saved before `_schema` existed carry it only under the
 * legacy `schema` key, which is read as a fallback and never served.
 */
export function contentSchemaId(content: ContentData): string {
  return content._schema || content['schema'];
}

/** The block as served for `locale`: translatable fields read `{field}_i18n_{locale}`, falling back to `{field}`. */
export function extractContent(content: ContentData, schemas: Map<string, Schema>, locale: string): ContentData {
  const schemaId = contentSchemaId(content);
  const extractedContentData: ContentData = {
    _id: content._id,
    _schema: schemaId,
  };
  const schema = schemas.get(schemaId);
  if (schema && (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE)) {
    for (const field of schema?.fields || []) {
      if (field.kind === SchemaFieldKind.SCHEMA) {
        const fieldContent: ContentData | undefined = content[field.name];
        if (fieldContent) {
          extractedContentData[field.name] = extractContent(fieldContent, schemas, locale);
        }
      } else if (field.kind === SchemaFieldKind.SCHEMAS) {
        const fieldContent: ContentData[] | undefined = content[field.name];
        if (fieldContent && Array.isArray(fieldContent)) {
          extractedContentData[field.name] = fieldContent.map(it => extractContent(it, schemas, locale));
        }
      } else {
        if (isFieldTranslatable(field)) {
          let value = content[`${field.name}_i18n_${locale}`];
          if (value === undefined) {
            value = content[field.name];
          }
          extractedContentData[field.name] = value;
        } else {
          extractedContentData[field.name] = content[field.name];
        }
      }
    }
  }
  return extractedContentData;
}

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
