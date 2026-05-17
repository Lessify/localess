import { bucket, firestoreService } from '../config';
import { DocumentReference, QueryDocumentSnapshot, Query, Timestamp } from 'firebase-admin/firestore';
import { Space, Translation } from '../models';
import { triggerWebHooksForEvent } from '../utils/webhook-utils';
import { WebHookEvent, WebHookPayload } from '../models/webhook.model';

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
 * Fires a TRANSLATION_PUBLISHED webhook once after files are written.
 * @param {string} spaceId
 * @param {Space} space
 */
export async function generateTranslationsDraft(spaceId: string, space: Space): Promise<void> {
  const translationsSnapshot = await findTranslations(spaceId).get();
  await saveTranslationFiles(spaceId, space, translationsSnapshot.docs, 'draft');
  const webhookPayload: WebHookPayload = {
    event: WebHookEvent.TRANSLATION_CHANGED,
    spaceId,
    timestamp: new Date().toISOString(),
    data: {},
  };
  await triggerWebHooksForEvent(spaceId, webhookPayload);
}
