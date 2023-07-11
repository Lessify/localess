import {firestoreService} from '../config';
import {DocumentReference, Query, Timestamp} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {translationExportArraySchema} from '../models/translation.model';

/**
 * find Translation by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTranslationById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/translations/${id}`);
}

/**
 * find Translations
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} collection
 */
export function findTranslations(spaceId: string, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/translations`);
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
export function validateTranslationImport(data: unknown): ErrorObject[] | undefined | null {
  const ajv = new Ajv();
  const validate = ajv.compile(translationExportArraySchema);
  if (validate(data)) {
    return undefined;
  } else {
    return validate.errors;
  }
}
