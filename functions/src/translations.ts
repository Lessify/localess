import { FieldValue, UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { BATCH_MAX, firestoreService } from './config';
import { PublishTranslationsData, Space, TranslateLocaleData, Translation, UserPermission, WebHookEvent, WebHookPayload } from './models';
import { deleteTranslations, findSpaceById, findTranslations, generateTranslationsDraft, saveTranslationFiles } from './services';
import { translateWithGoogle } from './services/translate.service';
import { canPerform } from './utils/user-auth-utils';
import { triggerWebHooksForEvent } from './utils/webhook-utils';

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
    const progress = await saveTranslationFiles(spaceId, space, translationsSnapshot.docs);
    await spaceSnapshot.ref.update('progress.translations', progress);
    const webhookPayload: WebHookPayload = {
      event: WebHookEvent.TRANSLATION_PUBLISHED,
      spaceId,
      timestamp: new Date().toISOString(),
      data: {},
    };
    await triggerWebHooksForEvent(spaceId, webhookPayload);
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

const publishDraft = onCall<{ spaceId: string }>(async request => {
  logger.info('[Translation:PublishDraft] data: ' + JSON.stringify(request.data));
  logger.info('[Translation:PublishDraft] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.TRANSLATION_UPDATE, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId } = data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (!spaceSnapshot.exists) {
    throw new HttpsError('not-found', 'Space not found');
  }
  const space = spaceSnapshot.data() as Space;
  await generateTranslationsDraft(spaceId, space);
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

  const candidates = translationsSnapshot.docs.filter(doc => {
    const translation = doc.data() as Translation;
    const sourceValue = translation.locales[sourceLocaleId];
    const targetValue = translation.locales[targetLocaleId];
    return sourceValue && !targetValue;
  });

  const results = await Promise.all(
    candidates.map(async doc => {
      const sourceValue = (doc.data() as Translation).locales[sourceLocaleId];
      try {
        const translatedValue = await translateWithGoogle(sourceValue, sourceLocaleId, targetLocaleId);
        return { doc, translatedValue };
      } catch (e) {
        logger.error(`[translationsTranslateLocale] Failed to translate '${doc.id}': ${e}`);
        return { doc, translatedValue: null };
      }
    })
  );

  let counter = 0;
  let count = 0;
  let batch = firestoreService.batch();
  for (const { doc, translatedValue } of results) {
    if (translatedValue) {
      const update = {
        [`locales.${targetLocaleId}`]: translatedValue,
      } as UpdateData<Translation>;
      update.updatedAt = FieldValue.serverTimestamp();
      batch.update(doc.ref, update);
      counter++;
      count++;
    }
    if (count === BATCH_MAX) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  logger.info(`[translationsTranslateLocale] Successfully updated ${counter}.`);
});

export const translation = {
  publish: publish,
  publishdraft: publishDraft,
  deleteall: deleteAll,
  translatelocale: translateLocale,
};
