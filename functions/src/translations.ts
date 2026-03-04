import { FieldValue, UpdateData, WithFieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { bucket, firestoreService } from './config';
import {
  PublishTranslationsData,
  Space,
  TranslateLocaleData,
  Translation,
  TranslationHistory,
  TranslationHistoryType,
  UserPermission,
} from './models';
import { deleteTranslations, findSpaceById, findTranslations, findTranslationsHistory, spaceTranslationCachePath } from './services';
import { translateCloud, translateWithGoogle } from './services/translate.service';
import { canPerform } from './utils/user-auth-utils';

// Publish
const publish = onCall<PublishTranslationsData>(async request => {
  logger.info('[translationsPublish] data: ' + JSON.stringify(request.data));
  logger.info('[translationsPublish] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.TRANSLATION_PUBLISH, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId } = data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  const translationsSnapshot = await findTranslations(spaceId).get();
  if (spaceSnapshot.exists && !translationsSnapshot.empty) {
    const space: Space = spaceSnapshot.data() as Space;
    const progress: Record<string, number> = {};
    for (const locale of space.locales) {
      let counter = 0;
      const localeStorage: Record<string, string> = {};
      for (const translation of translationsSnapshot.docs) {
        const tr = translation.data() as Translation;
        let value = tr.locales[locale.id];
        if (value) {
          counter++;
          // check the value is not empty string
          value = value || tr.locales[space.localeFallback.id];
        } else {
          value = tr.locales[space.localeFallback.id];
        }
        localeStorage[translation.id] = value;
      }
      progress[locale.id] = counter;
      // Save generated JSON
      logger.info(`[translationsPublish] Save file to spaces/${spaceId}/translations/${locale.id}.json`);
      await bucket.file(`spaces/${spaceId}/translations/${locale.id}.json`).save(JSON.stringify(localeStorage));
    }
    await spaceSnapshot.ref.update('progress.translations', progress);
    // Save Cache
    logger.info(`[translationsPublish] Save file to ${spaceTranslationCachePath(spaceId)}`);
    await bucket.file(spaceTranslationCachePath(spaceId)).save('');
    const addHistory: WithFieldValue<TranslationHistory> = {
      type: TranslationHistoryType.PUBLISHED,
      name: auth?.token['name'] || FieldValue.delete(),
      email: auth?.token.email || FieldValue.delete(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await findTranslationsHistory(spaceId).add(addHistory);
    return;
  } else {
    logger.info(`[translationsPublish] Space ${spaceId} does not exist or no translations.`);
    throw new HttpsError('not-found', 'Space not found');
  }
});

const deleteAll = onCall<{ spaceId: string }>(async request => {
  logger.info('[translationsDeleteAll] data: ' + JSON.stringify(request.data));
  logger.info('[translationsDeleteAll] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.SPACE_MANAGEMENT, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId } = data;
  await deleteTranslations(spaceId);
});

const onCreate = onDocumentCreated('spaces/{spaceId}/translations/{translationId}', async event => {
  logger.info(`[Translation:onCreate] eventId='${event.id}'`);
  logger.info(`[Translation:onCreate] params='${JSON.stringify(event.params)}'`);
  const { spaceId } = event.params;

  // No Data
  if (!event.data) return;
  const translation = event.data.data() as Translation;
  logger.info(`[Translation:onCreate] data='${JSON.stringify(translation)}'`);
  // No Auto Translate field define
  if (translation.autoTranslate === undefined) return;
  const update: UpdateData<Translation> = {
    autoTranslate: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  // autoTranslate only when it is required
  if (translation.autoTranslate) {
    const spaceSnapshot = await findSpaceById(spaceId).get();

    const space = spaceSnapshot.data() as Space;
    const localeValue = translation.locales[space.localeFallback.id];

    for (const locale of space.locales) {
      // skip already filled data
      if (locale.id === space.localeFallback.id) continue;
      try {
        const tValue = await translateCloud(localeValue, space.localeFallback.id, locale.id);
        if (tValue) {
          update[`locales.${locale.id}`] = tValue;
        }
      } catch (e) {
        logger.error(e);
      }
    }
  }

  logger.info(`[Translation:onCreate] eventId='${event.id}' Update : ${JSON.stringify(update)}`);
  await event.data.ref.update(update);
  return;
});

const onWriteToDraft = onDocumentWritten('spaces/{spaceId}/translations/{translationId}', async event => {
  logger.info(`[Translation:onWriteToDraft] eventId='${event.id}'`);
  logger.info(`[Translation:onWriteToDraft] params='${JSON.stringify(event.params)}'`);
  const { spaceId, translationId } = event.params;

  // No Data
  if (!event.data) return;

  const { before, after } = event.data;
  const beforeData = before.data() as Translation | undefined;
  const afterData = after.data() as Translation | undefined;

  // Skip if both before and after are undefined (shouldn't happen)
  if (!beforeData && !afterData) {
    logger.warn(`[Translation:onWriteToDraft] eventId='${event.id}' Both before and after data are undefined`);
    return;
  }

  // Check if locales have changed (skip regeneration if only metadata changed)
  if (beforeData && afterData) {
    const localesChanged = JSON.stringify(beforeData.locales) !== JSON.stringify(afterData.locales);
    if (!localesChanged) {
      logger.info(`[Translation:onWriteToDraft] translationId='${translationId}' Locales unchanged, skipping draft generation`);
      return;
    }
  }

  // For create or update, generate draft files
  if (afterData) {
    logger.info(`[Translation:onWriteToDraft] eventId='${event.id}' translationId='${translationId}' Generating draft files`);

    const spaceSnapshot = await findSpaceById(spaceId).get();
    const translationsSnapshot = await findTranslations(spaceId).get();

    if (spaceSnapshot.exists && !translationsSnapshot.empty) {
      const space: Space = spaceSnapshot.data() as Space;

      for (const locale of space.locales) {
        const localeStorage: Record<string, string> = {};
        for (const translation of translationsSnapshot.docs) {
          const tr = translation.data() as Translation;
          let value = tr.locales[locale.id];
          if (value) {
            // check the value is not empty string
            value = value || tr.locales[space.localeFallback.id];
          } else {
            value = tr.locales[space.localeFallback.id];
          }
          localeStorage[translation.id] = value;
        }
        // Save generated JSON to draft
        logger.info(`[Translation:onWriteToDraft] Save file to spaces/${spaceId}/translations/draft/${locale.id}.json`);
        await bucket.file(`spaces/${spaceId}/translations/draft/${locale.id}.json`).save(JSON.stringify(localeStorage));
      }
    }
  } else if (beforeData) {
    // For delete, regenerate draft files without the deleted translation
    logger.info(
      `[Translation:onWriteToDraft] eventId='${event.id}' translationId='${translationId}' Regenerating draft files after delete`
    );

    const spaceSnapshot = await findSpaceById(spaceId).get();
    const translationsSnapshot = await findTranslations(spaceId).get();

    if (spaceSnapshot.exists) {
      const space: Space = spaceSnapshot.data() as Space;

      for (const locale of space.locales) {
        const localeStorage: Record<string, string> = {};

        // Only include remaining translations (deleted one is already removed from collection)
        if (!translationsSnapshot.empty) {
          for (const translation of translationsSnapshot.docs) {
            const tr = translation.data() as Translation;
            let value = tr.locales[locale.id];
            if (value) {
              value = value || tr.locales[space.localeFallback.id];
            } else {
              value = tr.locales[space.localeFallback.id];
            }
            localeStorage[translation.id] = value;
          }
        }

        // Save generated JSON to draft (will be empty object if no translations left)
        logger.info(`[Translation:onWriteToDraft] Save file to spaces/${spaceId}/translations/draft/${locale.id}.json`);
        await bucket.file(`spaces/${spaceId}/translations/draft/${locale.id}.json`).save(JSON.stringify(localeStorage));
      }
    }
  }
  logger.info(`[Translation:onWriteToDraft] Save file to ${spaceTranslationCachePath(spaceId)}`);
  await bucket.file(spaceTranslationCachePath(spaceId)).save('');
  return;
});

const onWriteToHistory = onDocumentWritten('spaces/{spaceId}/translations/{translationId}', async event => {
  logger.info(`[Translation:onWrite] eventId='${event.id}'`);
  logger.info(`[Translation:onWrite] params='${JSON.stringify(event.params)}'`);
  const { spaceId, translationId } = event.params;

  // No Data
  if (!event.data) return;
  const { before, after } = event.data;
  const beforeData = before.data() as Translation | undefined;
  const afterData = after.data() as Translation | undefined;
  let addHistory: WithFieldValue<TranslationHistory> = {
    type: TranslationHistoryType.PUBLISHED,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (beforeData && afterData) {
    // change
    addHistory = {
      type: TranslationHistoryType.UPDATE,
      key: translationId,
      createdAt: FieldValue.serverTimestamp(),
    };
  } else if (beforeData) {
    // delete
    addHistory = {
      type: TranslationHistoryType.DELETE,
      key: translationId,
      createdAt: FieldValue.serverTimestamp(),
    };
    const spaceSnapshot = await findSpaceById(spaceId).get();
    // Skip History in case Space is deleted
    if (!spaceSnapshot.exists) {
      return;
    }
  } else if (afterData) {
    // create
    addHistory = {
      type: TranslationHistoryType.CREATE,
      key: translationId,
      createdAt: FieldValue.serverTimestamp(),
    };
  }
  if (afterData?.updatedBy) {
    addHistory.email = afterData.updatedBy.email;
    addHistory.name = afterData.updatedBy.name;
  }
  await findTranslationsHistory(spaceId).add(addHistory);
  const countSnapshot = await findTranslationsHistory(spaceId).count().get();
  const { count } = countSnapshot.data();
  if (count > 30) {
    const historySnapshot = await findTranslationsHistory(spaceId)
      .orderBy('createdAt', 'asc')
      .limit(count - 30)
      .get();
    if (historySnapshot.size > 0) {
      const batch = firestoreService.batch();
      historySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }
  return;
});

const translateLocale = onCall<TranslateLocaleData>(async request => {
  logger.info('[translationsTranslateLocale] data: ' + JSON.stringify(request.data));
  logger.info('[translationsTranslateLocale] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.TRANSLATION_UPDATE, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId, sourceLocaleId, targetLocaleId } = data;

  const translationsSnapshot = await findTranslations(spaceId).get();
  if (translationsSnapshot.empty) {
    logger.info(`[translationsTranslateLocale] Space ${spaceId} has no translations.`);
    return;
  }

  const bulk = firestoreService.bulkWriter();
  let counter = 0;
  for (const doc of translationsSnapshot.docs) {
    const translation = doc.data() as Translation;
    const sourceValue = translation.locales[sourceLocaleId];
    const targetValue = translation.locales[targetLocaleId];
    // Skip if source value is empty or target value already exists
    if (!sourceValue) continue;
    if (targetValue) continue;
    try {
      const translatedValue = await translateWithGoogle(sourceValue, sourceLocaleId, targetLocaleId);
      if (translatedValue) {
        const update: UpdateData<Translation> = {
          [`locales.${targetLocaleId}`]: translatedValue,
          updatedAt: FieldValue.serverTimestamp(),
        };
        bulk.update(doc.ref, update);
        counter++;
      }
    } catch (e) {
      logger.error(`[translationsTranslateLocale] Failed to translate '${doc.id}': ${e}`);
    }
  }
  await bulk.close();
  logger.info(`[translationsTranslateLocale] Bulk successfully updated ${counter}.`);
});

export const translation = {
  publish: publish,
  oncreate: onCreate,
  onwritetodraft: onWriteToDraft,
  onwritetohistory: onWriteToHistory,
  deleteall: deleteAll,
  translatelocale: translateLocale,
};
