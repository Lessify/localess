import { DocumentReference, Query, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { firestoreService } from '../config';
import {
  Content,
  ContentData,
  ContentDocumentExport,
  ContentExport,
  ContentFolderExport,
  ContentKind,
  Schema,
  SchemaFieldKind,
  SchemaType,
} from '../models';

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
 * find Content by Parent Slug
 * @param {string} spaceId Space identifier
 * @param {string} parentSlug Parent Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentByParentSlug(spaceId: string, parentSlug: string): Query {
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
 * extract Locale Content
 * @param {ContentData} content content
 * @param {Schema[]} schemas schema
 * @param {string} locale locale
 * @return {ContentData} content
 */
export function extractContent(content: ContentData, schemas: Schema[], locale: string): ContentData {
  const extractedContentData: ContentData = {
    _id: content._id,
    schema: content.schema,
  };
  const schema = schemas.find(it => it.name == content.schema);
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
