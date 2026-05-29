import { DocumentReference, Query, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { bucket, firestoreService } from '../config';
import {
  AssetFile,
  AssetKind,
  Content,
  AssetMetadata,
  ContentData,
  ContentDocument,
  ContentDocumentApi,
  ContentDocumentExport,
  ContentDocumentStorage,
  ContentExport,
  ContentFolderExport,
  ContentKind,
  ContentMetadata,
  Schema,
  SchemaFieldKind,
  SchemaType,
} from '../models';
import { findAssetById } from './asset.service';

/**
 * find Content by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} fullSlug Full Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentByFullSlug(spaceId: string, fullSlug: string): Query {
  logger.info(`[findContentByFullSlug] spaceId=${spaceId} fullSlug=${fullSlug}`);
  return firestoreService.collection(`spaces/${spaceId}/contents`).where('fullSlug', '==', fullSlug).limit(1);
}

/**
 * find all Contents by Parent Slug
 * @param {string} spaceId Space identifier
 * @param {string} parentSlug Parent Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findAllContentsByParentSlug(spaceId: string, parentSlug: string): Query {
  logger.info(`[findAllContentsByParentSlug] spaceId=${spaceId} parentSlug=${parentSlug}`);
  return firestoreService.collection(`spaces/${spaceId}/contents`).where('parentSlug', '==', parentSlug);
}

/**
 * find Content by Parent Slug
 * @param {string} spaceId Space identifier
 * @param {string} parentSlug Parent Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentByParentSlug(spaceId: string, parentSlug: string): Query {
  logger.info(`[findContentByParentSlug] spaceId=${spaceId} parentSlug=${parentSlug}`);
  return firestoreService.collection(`spaces/${spaceId}/contents`).where('parentSlug', '==', parentSlug).limit(1);
}

/**
 * find Content by Slug
 * @param {string} spaceId Space identifier
 * @param {string} slug Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentBySlug(spaceId: string, slug: string): Query {
  return firestoreService.collection(`spaces/${spaceId}/contents`).where('slug', '==', slug).limit(1);
}

/**
 * find Content by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} startFullSlug Start Full Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentsByStartFullSlug(spaceId: string, startFullSlug: string): Query {
  logger.info(`[findContentsByStartFullSlug] spaceId=${spaceId} startFullSlug=${startFullSlug}`);
  return firestoreService
    .collection(`spaces/${spaceId}/contents`)
    .where('fullSlug', '>=', startFullSlug)
    .where('fullSlug', '<', `${startFullSlug}~`);
}

/**
 * find Content by Parent Slug
 * @param {string} spaceId Space identifier
 * @param {string} parentSlug Parent Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findDocumentsToPublishByParentSlug(spaceId: string, parentSlug: string): Query {
  logger.info(`[findDocumentsToPublishByParentSlug] spaceId=${spaceId} parentSlug=${parentSlug}`);
  return firestoreService
    .collection(`spaces/${spaceId}/contents`)
    .where('parentSlug', '>=', parentSlug)
    .where('parentSlug', '<', `${parentSlug}/~`)
    .where('kind', '==', ContentKind.DOCUMENT);
}

/**
 * find Content by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findContentById(spaceId: string, id: string): DocumentReference {
  logger.info(`[findContentById] spaceId=${spaceId} id=${id}`);
  return firestoreService.doc(`spaces/${spaceId}/contents/${id}`);
}

/**
 * find Contents
 * @param {string} spaceId Space identifier
 * @param {ContentKind} kind Content kind : FOLDER or DOCUMENT
 * @param {number} fromDate Space identifier
 * @return {Query} collection
 */
export function findContents(spaceId: string, kind?: ContentKind, fromDate?: number): Query {
  let contentsRef: Query = firestoreService.collection(`spaces/${spaceId}/contents`);
  if (fromDate) {
    contentsRef = contentsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
  }
  if (kind) {
    contentsRef = contentsRef.where('kind', '==', kind);
  }
  return contentsRef;
}

/**
 * construct content locale cache path, will return url to the generated content JSON file
 * @param {string} spaceId
 * @param {string} contentId
 * @param {string} locale
 * @param {string} version
 * @return {string} path
 */
export function contentLocaleCachePath(spaceId: string, contentId: string, locale: string, version: string | 'draft' | undefined): string {
  if (version === 'draft') {
    return `spaces/${spaceId}/contents/${contentId}/draft/${locale}.json`;
  } else {
    return `spaces/${spaceId}/contents/${contentId}/${locale}.json`;
  }
}

/**
 * construct content cache path, will return url to the cache file for cache version identifier
 * @param {string} spaceId
 * @return {string} path
 */
export function spaceContentCachePath(spaceId: string): string {
  return `spaces/${spaceId}/contents/cache.json`;
}

/**
 * extract Locale Content
 * @param {ContentData} content content
 * @param {Schema[]} schemas schema
 * @param {string} locale locale
 * @return {ContentData} content
 */
export function extractContent(content: ContentData, schemas: Map<string, Schema>, locale: string): ContentData {
  const extractedContentData: ContentData = {
    _id: content._id,
    _schema: content._schema || content.schema,
    schema: content.schema,
  };
  const schema = schemas.get(content.schema);
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
        if (field.translatable) {
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

/**
 * validate imported JSON
 * @param {string} docId Document ID
 * @param {Content} content Content
 * @return {ContentExport} exported content
 */
export function docContentToExport(docId: string, content: Content): ContentExport | undefined {
  if (content.kind === ContentKind.FOLDER) {
    return {
      id: docId,
      kind: ContentKind.FOLDER,
      name: content.name,
      slug: content.slug,
      parentSlug: content.parentSlug,
      fullSlug: content.fullSlug,
    } as ContentFolderExport;
  } else if (content.kind === ContentKind.DOCUMENT) {
    return {
      id: docId,
      kind: ContentKind.DOCUMENT,
      name: content.name,
      slug: content.slug,
      parentSlug: content.parentSlug,
      fullSlug: content.fullSlug,
      schema: content.schema,
      data: content.data,
    } as ContentDocumentExport;
  }
  return undefined;
}

/**
 * Resolve references for a single content document
 * @param {string} spaceId Space identifier
 * @param {ContentDocumentStorage} content Content document
 * @param {string} locale Locale identifier
 * @param {string} version Content version
 * @return {Promise<Record<string, ContentDocumentStorage>>} Map of reference ID to content
 */
export async function resolveReferences(
  spaceId: string,
  content: ContentDocumentStorage,
  locale: string,
  version: string | 'draft' | undefined
): Promise<Record<string, ContentDocumentApi> | undefined> {
  if (!content.references || content.references.length === 0) {
    return undefined;
  }
  const resolvedReferences: Record<string, ContentDocumentApi> = {};
  await Promise.all(
    content.references.map(async refId => {
      if (refId) {
        try {
          const refCachePath = contentLocaleCachePath(spaceId, refId, locale, version);
          const [exists] = await bucket.file(refCachePath).exists();

          if (exists) {
            const [fileContent] = await bucket.file(refCachePath).download();
            resolvedReferences[refId] = JSON.parse(fileContent.toString());
          } else {
            logger.warn(`[ReferenceResolver::resolveReferences] Reference ${refId} not found at ${refCachePath}`);
          }
        } catch (error) {
          logger.error(`[ReferenceResolver::resolveReferences] Failed to resolve reference ${refId}:`, error);
        }
      } else {
        logger.warn(`[ReferenceResolver::resolveReferences] Reference ${refId} not found.`);
      }
    })
  );
  return resolvedReferences;
}

/**
 * Resolve links for a single content document
 * @param {string} spaceId Space identifier
 * @param {ContentDocumentStorage} content Content document
 * @return {Promise<Record<string, ContentMetadata>>} Map of reference ID to content
 */
export async function resolveLinks(spaceId: string, content: ContentDocumentStorage): Promise<Record<string, ContentMetadata> | undefined> {
  if (!content.links || content.links.length === 0) {
    return undefined;
  }
  const resolvedLinks: Record<string, ContentMetadata> = {};
  await Promise.all(
    content.links.map(async linkId => {
      const contentSnapshot = await findContentById(spaceId, linkId).get();
      const content = contentSnapshot.data() as Content;
      const link: ContentMetadata = {
        id: contentSnapshot.id,
        kind: content.kind,
        name: content.name,
        slug: content.slug,
        fullSlug: content.fullSlug,
        parentSlug: content.parentSlug,
        createdAt: content.createdAt.toDate().toISOString(),
        updatedAt: content.updatedAt.toDate().toISOString(),
      };
      if (content.kind === ContentKind.DOCUMENT) {
        link.publishedAt = content.publishedAt?.toDate().toISOString();
      }
      resolvedLinks[linkId] = link;
    })
  );
  return resolvedLinks;
}

/**
 * Resolve assets for a single content document
 * @param {string} spaceId Space identifier
 * @param {ContentDocumentStorage} content Content document
 * @return {Promise<Record<string, AssetMetadata>>} Map of asset ID to asset
 */
export async function resolveAssets(spaceId: string, content: ContentDocumentStorage): Promise<Record<string, AssetMetadata> | undefined> {
  if (!content.assets || content.assets.length === 0) {
    return undefined;
  }
  const resolvedAssets: Record<string, AssetMetadata> = {};
  await Promise.all(
    content.assets.map(async assetId => {
      const assetSnapshot = await findAssetById(spaceId, assetId).get();
      if (assetSnapshot.exists) {
        const asset = assetSnapshot.data() as AssetFile;
        if (asset.kind === AssetKind.FILE) {
          const contentAsset: AssetMetadata = {
            id: assetSnapshot.id,
            name: asset.name,
            extension: asset.extension,
            type: asset.type,
          };
          if (asset.alt) {
            contentAsset.alt = asset.alt;
          }
          resolvedAssets[assetId] = contentAsset;
        }
      } else {
        logger.warn(`[resolveAssets] Asset ${assetId} not found in space ${spaceId}`);
      }
    })
  );
  return resolvedAssets;
}

/**
 * Returns true if any imported field differs from the existing Firestore content document.
 * Compares kind, name, slug, parentSlug, and fullSlug for all content types.
 * For DOCUMENT content, also compares schema, data, assets, links, and references.
 * @param {Content} existing - the current Firestore content document
 * @param {ContentExport} imported - the content data parsed from the import file
 * @return {boolean} true if at least one field has changed
 */
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
