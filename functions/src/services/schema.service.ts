import {firestoreService} from '../config';
import {DocumentReference, Query, Timestamp} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {schemaExportArraySchema} from '../models/schema.model';

/**
 * find Schema by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findSchemaById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/schemas/${id}`);
}

/**
 * find Contents
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} collection
 */
export function findSchemas(spaceId: string, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/schemas`);
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
export function validateSchemaImport(data: unknown): ErrorObject[] | undefined | null {
  const ajv = new Ajv();
  const validate = ajv.compile(schemaExportArraySchema);
  if (validate(data)) {
    return undefined;
  } else {
    return validate.errors;
  }
}
