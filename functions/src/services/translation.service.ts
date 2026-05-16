import { bucket, firestoreService } from '../config';
import { DocumentReference, DocumentSnapshot, QueryDocumentSnapshot, Query, Timestamp, WithFieldValue } from 'firebase-admin/firestore';
import { Space, Translation } from '../models';

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

/**
 * Returns the Firestore reference for the translation import lock document.
 * The lock is set while a translation import task is running so that the
 * onWriteToDraft trigger can skip per-document draft regeneration and let
 * the import task generate the draft once at the end.
 * @param {string} spaceId
 * @return {DocumentReference} reference to the lock document
 */
export function translationImportLockRef(spaceId: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/locks/translationImport`);
}

/**
 * Acquires the translation import lock for the given space.
 * @param {string} spaceId
 * @param {string} taskId
 */
export async function acquireTranslationImportLock(spaceId: string, taskId: string): Promise<void> {
  const data: WithFieldValue<{ active: boolean; taskId: string }> = { active: true, taskId };
  await translationImportLockRef(spaceId).set(data);
}

/**
 * Releases the translation import lock for the given space.
 * @param {string} spaceId
 */
export async function releaseTranslationImportLock(spaceId: string): Promise<void> {
  await translationImportLockRef(spaceId).delete();
}

/**
 * Returns a snapshot of the translation import lock document.
 * Callers can use snapshot.exists to determine whether an import is in progress.
 * @param {string} spaceId
 * @return {Promise<DocumentSnapshot>}
 */
export async function getTranslationImportLock(spaceId: string): Promise<DocumentSnapshot> {
  return translationImportLockRef(spaceId).get();
}

/**
 * Builds per-locale translation maps from a snapshot and saves them to Storage.
 * The `version` parameter controls whether files are saved to the draft path
 * (`draft/<locale>.json`) or the published path (`<locale>.json`).
 * Returns a progress map (locale → number of translated entries) so callers
 * can persist it to the Space document when publishing.
 *
 * @param {string} spaceId
 * @param {Space} space
 * @param {QueryDocumentSnapshot[]} translationDocs
 * @param {'draft'} version
 * @return {Promise<Record<string, number>>} progress map
 */
export async function saveTranslationFiles(
  spaceId: string,
  space: Space,
  translationDocs: QueryDocumentSnapshot[],
  version?: 'draft'
): Promise<Record<string, number>> {
  const progress: Record<string, number> = {};
  for (const locale of space.locales) {
    let counter = 0;
    const localeStorage: Record<string, string> = {};
    for (const doc of translationDocs) {
      const tr = doc.data() as Translation;
      let value = tr.locales[locale.id];
      if (value) {
        counter++;
        // fall back to default locale when value is an empty string
        value = value || tr.locales[space.localeFallback.id];
      } else {
        value = tr.locales[space.localeFallback.id];
      }
      localeStorage[doc.id] = value;
    }
    progress[locale.id] = counter;
    const filePath =
      version === 'draft' ? `spaces/${spaceId}/translations/draft/${locale.id}.json` : `spaces/${spaceId}/translations/${locale.id}.json`;
    await bucket.file(filePath).save(JSON.stringify(localeStorage));
  }
  await bucket.file(spaceTranslationCachePath(spaceId)).save('');
  return progress;
}

/**
 * Fetches all translations for the space and generates the draft JSON files
 * for every locale.  Called once at the end of a translation import task
 * instead of triggering a draft regeneration per individual document write.
 * @param {string} spaceId
 * @param {Space} space
 */
export async function generateTranslationsDraft(spaceId: string, space: Space): Promise<void> {
  const translationsSnapshot = await findTranslations(spaceId).get();
  await saveTranslationFiles(spaceId, space, translationsSnapshot.docs, 'draft');
}
