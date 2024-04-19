import { firestoreService } from '../config';
import { CollectionReference, DocumentReference } from 'firebase-admin/firestore';
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
export function findSpaces(): CollectionReference {
  return firestoreService.collection('spaces');
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
