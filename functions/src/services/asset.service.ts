import {firestoreService} from '../config';
import {CollectionReference, DocumentReference} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {assetExportImportArraySchema} from '../models/asset.model';

/**
 * find Assets
 * @param {string} spaceId Space identifier
 * @return {DocumentReference} document reference to the space
 */
export function findAssets(spaceId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/assets`);
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
