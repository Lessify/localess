import {firestoreService} from '../config';
import {DocumentReference, Query, Timestamp} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {assetExportArraySchema} from '../models/content.model';

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
