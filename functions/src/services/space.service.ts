import { firestoreService } from '../config';
import { CollectionReference, DocumentReference, WithFieldValue } from 'firebase-admin/firestore';
import { Space } from '../models';

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
export function findAllSpaces(): CollectionReference {
  return firestoreService.collection('spaces');
}

/**
 * create a Spaces
 * @param {Space} space Space entity
 * @return {CollectionReference} collection
 */
export function createSpace(space: WithFieldValue<Space>): Promise<DocumentReference> {
  return firestoreService.collection('spaces').add(space);
}

/**
 * identify Space locale
 * @param {Space} space
 * @param {string} locale
 * @return {string} locale
 */
export function identifySpaceLocale(space: Space, locale: string | undefined): string {
  if (locale === undefined) {
    return space.localeFallback.id;
  }
  if (space.locales.some(it => it.id === locale)) {
    return locale;
  }
  return space.localeFallback.id;
}
