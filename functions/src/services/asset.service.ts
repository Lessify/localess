import {firestoreService} from '../config';
import {DocumentReference, CollectionReference} from 'firebase-admin/firestore';

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


