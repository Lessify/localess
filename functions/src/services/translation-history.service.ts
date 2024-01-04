import { firestoreService } from '../config';
import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';

/**
 * find Translation History by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTranslationHistoryById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/translations_history/${id}`);
}

/**
 * find Tasks
 * @param {string} spaceId Space identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTranslationsHistory(spaceId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/translations_history`);
}
