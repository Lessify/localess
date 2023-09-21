import { firestoreService } from '../config';
import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';

/**
 * find Tasks
 * @param {string} spaceId Space identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTasks(spaceId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/tasks`);
}

/**
 * find Task by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Task identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTaskById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/tasks/${id}`);
}
