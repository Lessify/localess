import { firestoreService } from '../config';
import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';

/**
 * find Users
 * @return {DocumentReference} document reference to the space
 */
export function findUsers(): CollectionReference {
  return firestoreService.collection('users');
}

/**
 * find User by ID
 * @param {string} id Task identifier
 * @return {DocumentReference} document reference to the space
 */
export function findUserById(id: string): DocumentReference {
  return firestoreService.doc(`users/${id}`);
}
