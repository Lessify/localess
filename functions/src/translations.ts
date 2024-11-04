import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, WithFieldValue } from 'firebase-admin/firestore';
import { canPerform } from './utils/security-utils';
import { bucket } from './config';
import { PublishTranslationsData, Space, Translation, TranslationHistory, TranslationHistoryType, UserPermission } from './models';
import { findSpaceById, findTranslations, findTranslationsHistory } from './services';
import { translateCloud } from './services/translate.service';

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
      // Save generated JSON
      logger.info(`[translationsPublish] Save file to spaces/${spaceId}/translations/${locale.id}.json`);
      bucket.file(`spaces/${spaceId}/translations/${locale.id}.json`).save(JSON.stringify(localeStorage), (err?: Error | null) => {
        if (err) {
          logger.error(`[translationsPublish] Can not save file for Space(${spaceId}) and Locale(${locale})`);
          logger.error(err);
        }
      });
    }
    // Save Cache
    logger.info(`[translationsPublish] Save file to spaces/${spaceId}/translations/cache.json`);
    await bucket.file(`spaces/${spaceId}/translations/cache.json`).save('');
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
  const update: any = {
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
        const tValue = translateCloud(localeValue, space.localeFallback.id, locale.id);
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
  return;
});

export const translation = {
  publish: publish,
  oncreate: onCreate,
  onwritetohistory: onWriteToHistory,
};
