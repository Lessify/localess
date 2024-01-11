import { firestoreService } from '../config';
import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';

/**
 * find Content History by ID
 * @param {string} spaceId Space identifier
 * @param {string} contentId Content identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findContentHistoryById(spaceId: string, contentId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/contents/${contentId}/histories/${id}`);
}

/**
 * find Contents History
 * @param {string} spaceId Space identifier
 * @param {string} contentId Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findContentsHistory(spaceId: string, contentId: string): CollectionReference {
  return firestoreService.collection(`spaces/${spaceId}/contents/${contentId}/histories`);
}
