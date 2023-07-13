import {https, logger} from 'firebase-functions/v2';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {SecurityUtils} from './utils/security-utils';
import {
  bucket,
  firebaseConfig,
  firestoreService,
  SUPPORT_LOCALES,
  translationService,
} from './config';
import {Space} from './models/space.model';
import {PublishTranslationsData, Translation} from './models/translation.model';
import {FieldValue} from 'firebase-admin/firestore';
import {protos} from '@google-cloud/translate';
import {UserPermission} from './models/user.model';
import {findSpaceById} from './services/space.service';


// Publish
export const translationsPublish = https.onCall<PublishTranslationsData>(async (request) => {
  logger.info('[translationsPublish] data: ' + JSON.stringify(request.data));
  logger.info('[translationsPublish] context.auth: ' + JSON.stringify(request.auth));
  if (!SecurityUtils.canPerform(UserPermission.TRANSLATION_PUBLISH, request.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  const spaceSnapshot = await firestoreService.doc(`spaces/${request.data.spaceId}`).get();
  const translationsSnapshot = await firestoreService.collection(`spaces/${request.data.spaceId}/translations`).get();
  if (spaceSnapshot.exists && !translationsSnapshot.empty) {
    const space: Space = spaceSnapshot.data() as Space;
    const translations = translationsSnapshot.docs.filter((it) => it.exists).map((it) => it.data() as Translation);

    for (const locale of space.locales) {
      const localeStorage: Record<string, string> = {};
      for (const tr of translations) {
        let value = tr.locales[locale.id];
        if (value) {
          // check the value is not empty string
          value = value || tr.locales[space.localeFallback.id];
        } else {
          value = tr.locales[space.localeFallback.id];
        }
        localeStorage[tr.name] = value;
      }
      // Save generated JSON
      logger.info(`[translationsPublish] Save file to spaces/${request.data.spaceId}/translations/${locale.id}.json`);
      bucket.file(`spaces/${request.data.spaceId}/translations/${locale.id}.json`)
        .save(
          JSON.stringify(localeStorage),
          (err?: Error | null) => {
            if (err) {
              logger.error(`[translationsPublish] Can not save file for Space(${request.data.spaceId}) and Locale(${locale})`);
              logger.error(err);
            }
          }
        );
    }
    // Save Cache
    logger.info(`[translationsPublish] Save file to spaces/${request.data.spaceId}/translations/cache.json`);
    await bucket.file(`spaces/${request.data.spaceId}/translations/cache.json`).save('');
    return;
  } else {
    logger.info(`[translationsPublish] Space ${request.data.spaceId} does not exist or no translations.`);
    throw new https.HttpsError('not-found', 'Space not found');
  }
});

export const onTranslationCreate = onDocumentCreated('spaces/{spaceId}/translations/{translationId}', async (event) => {
  logger.info(`[Translation:onCreate] eventId='${event.id}'`);
  logger.info(`[Translation:onCreate] params='${JSON.stringify(event.params)}'`);
  const {spaceId} = event.params;

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
    // is incoming locale supporting translation ?
    if (!SUPPORT_LOCALES.has(space.localeFallback.id)) return;

    const localeValue = translation.locales[space.localeFallback.id];

    const projectId = firebaseConfig.projectId;
    let locationId; // firebaseConfig.locationId || 'global'
    if (firebaseConfig.locationId && firebaseConfig.locationId.startsWith('us-')) {
      locationId = 'us-central1';
    } else {
      locationId = 'global';
    }

    for (const locale of space.locales) {
      // skip already filled data
      if (locale.id === space.localeFallback.id) continue;
      // skip unsupported locale
      if (!SUPPORT_LOCALES.has(locale.id)) continue;

      const request: protos.google.cloud.translation.v3.ITranslateTextRequest = {
        parent: `projects/${projectId}/locations/${locationId}`,
        contents: [localeValue],
        mimeType: 'text/plain',
        sourceLanguageCode: space.localeFallback.id,
        targetLanguageCode: locale.id,
      };
      try {
        const [responseTranslateText] = await translationService.translateText(request);
        if (responseTranslateText.translations && responseTranslateText.translations.length > 0) {
          update[`locales.${locale.id}`] = responseTranslateText.translations[0].translatedText;
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
