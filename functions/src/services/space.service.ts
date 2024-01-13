import { firestoreService } from '../config';
import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';

/**
 * find Space by ID
 * @param {string} id Space identifier
 * @return {DocumentReference} document reference to the space
 */
export function findSpaceById(id: string): DocumentReference {
  return firestoreService.doc(`spaces/${id}`);
}

/**
 * find Spaces
 * @return {CollectionReference} collection
 */
export function findSpaces(): CollectionReference {
  return firestoreService.collection('spaces');
}
