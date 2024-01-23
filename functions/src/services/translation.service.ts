import { firestoreService } from '../config';
import { DocumentReference, Query, Timestamp } from 'firebase-admin/firestore';

/**
 * find Translation by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Content identifier
 * @return {DocumentReference} document reference to the space
 */
export function findTranslationById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/translations/${id}`);
}

/**
 * find Translations
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} collection
 */
export function findTranslations(spaceId: string, fromDate?: number): Query {
  let translationsRef: Query = firestoreService.collection(`spaces/${spaceId}/translations`);
  if (fromDate) {
    translationsRef = translationsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
  }
  return translationsRef;
}
