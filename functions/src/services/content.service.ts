import {firestoreService} from '../config';
import {DocumentReference, Query, Timestamp} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {assetExportArraySchema, ContentData} from '../models/content.model';
import {Schema, SchemaFieldKind} from "../models/schema.model";

/**
 * find Content by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} fullSlug Full Slug path
 * @return {DocumentReference} document reference to the space
 */
export function findContentByFullSlug(spaceId: string, fullSlug: string): Query {
  return firestoreService.collection(`spaces/${spaceId}/contents`)
    .where('fullSlug', '==', fullSlug).limit(1);
}

/**
 * find Content by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findContentById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/contents/${id}`);
}

/**
 * find Contents
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} collection
 */
export function findContents(spaceId: string, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/contents`);
  if (fromDate) {
    assetsRef = assetsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
  }
  return assetsRef;
}

/**
 * validate imported JSON
 * @param {unknown} data Imported JSON
 * @return {ErrorObject[]} errors in case they exist
 */
export function validateContentImport(data: unknown): ErrorObject[] | undefined | null {
  const ajv = new Ajv({discriminator: true});
  const validate = ajv.compile(assetExportArraySchema);
  if (validate(data)) {
    return undefined;
  } else {
    return validate.errors;
  }
}

/**
 * extract Locale Content
 * @param {ContentData} content content
 * @param {Schema[]} schemas schema
 * @param {string} locale locale
 * @param {string} localeFallback fallback locale
 * @return {ContentData} content
 */
export function extractContent(content: ContentData, schemas: Schema[], locale: string, localeFallback: string): ContentData {
  const extractedContentData : ContentData = {
    _id: content._id,
    schema: content.schema,
  };
  const schema = schemas.find((it) => it.name == content.schema);
  for (const field of schema?.fields || []) {
    if (field.kind === SchemaFieldKind.SCHEMA) {
      extractedContentData[field.name] = extractContent(content[field.name], schemas, locale, localeFallback);
    } else if (field.kind === SchemaFieldKind.SCHEMAS) {
      if (Array.isArray(content[field.name])) {
        extractedContentData[field.name] = (content[field.name] as ContentData[]).map((it) => extractContent(it, schemas, locale, localeFallback));
      }
    } else {
      if (field.translatable) {
        let value = content[`${field.name}_i18n_${locale}`];
        if (!value) {
          value = content[`${field.name}_i18n_${localeFallback}`];
        }
        extractedContentData[field.name] = value;
      } else {
        extractedContentData[field.name] = content[field.name];
      }
    }
  }
  return extractedContentData;
}
