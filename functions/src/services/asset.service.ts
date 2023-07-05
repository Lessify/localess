import {firestoreService} from '../config';
import {Timestamp, DocumentReference, Query} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {assetExportImportArraySchema} from '../models/asset.model';

/**
 * find Assets
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} document reference to the space
 */
export function findAssets(spaceId: string, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/assets`);
  if (fromDate) {
    assetsRef = assetsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
  }
  return assetsRef;
}

/**
 * find Asset by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Asset identifier
 * @return {DocumentReference} document reference to the space
 */
export function findAssetById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/assets/${id}`);
}

/**
 * validate imported JSON
 * @param {unknown} data Imported JSON
 * @return {ErrorObject[]} errors in case they exist
 */
export function validateImport(data: unknown): ErrorObject[] | undefined | null {
  const ajv = new Ajv({discriminator: true});
  const validate = ajv.compile(assetExportImportArraySchema);
  if (validate(data)) {
    return undefined;
  } else {
    return validate.errors;
  }
}
