import {firestoreService} from '../config';
import {CollectionReference, DocumentReference} from 'firebase-admin/firestore';

/**
 * find Space by ID
 * @param {string} spaceId Space identifier
 * @return {DocumentReference} document reference to the space
 */
export function findSpaceById(spaceId: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}`);
}

/**
 * find Spaces
 * @return {CollectionReference} collection
 */
export function findSpaces(): CollectionReference {
  return firestoreService.collection('spaces');
}
