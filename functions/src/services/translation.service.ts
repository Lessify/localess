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

/**
 * delete Translations
 * @param {string} spaceId
 * @return {void}
 */
export function deleteTranslations(spaceId: string): Promise<void> {
  const translationsRef = firestoreService.collection(`spaces/${spaceId}/translations`);
  return firestoreService.recursiveDelete(translationsRef);
}

/**
 * construct translation locale cache path, will return url to the generated translation JSON file
 * @param {string} spaceId
 * @param {string} locale
 * @param {string} version
 * @return {string} path
 */
export function translationLocaleCachePath(spaceId: string, locale: string, version: string | 'draft' | undefined): string {
  if (version === 'draft') {
    return `spaces/${spaceId}/translations/draft/${locale}.json`;
  } else {
    return `spaces/${spaceId}/translations/${locale}.json`;
  }
}

/**
 * construct translation cache path, will return url to the cache file for cache version identifier
 * @param {string} spaceId
 * @return {string} path
 */
export function spaceTranslationCachePath(spaceId: string): string {
  return `spaces/${spaceId}/translations/cache.json`;
}
