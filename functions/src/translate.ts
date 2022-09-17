import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {ROLE_ADMIN, ROLE_EDIT, ROLE_WRITE, translationService} from './config';
import {FIREBASE_CONFIG, FirebaseConfig} from './models/firebase.model';
import {TranslateData} from './models/translate.model';
import {protos} from '@google-cloud/translate';

export const translate = https.onCall(async (data: TranslateData, context) => {
  logger.info('[translate] data: ' + JSON.stringify(data));
  logger.info('[translate] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_EDIT, ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  const firebaseConfig: FirebaseConfig = JSON.parse(process.env[FIREBASE_CONFIG] || '')
  const projectId = firebaseConfig.projectId
  let locationId; //firebaseConfig.locationId || 'global'
  if (firebaseConfig.locationId && firebaseConfig.locationId.startsWith('us')) {
    locationId = 'us-central1'
  } else {
    locationId = 'global'
  }

  const request: protos.google.cloud.translation.v3.ITranslateTextRequest = {
    parent: `projects/${projectId}/locations/${locationId}`,
    contents: [data.content],
    mimeType: 'text/plain',
    sourceLanguageCode: data.sourceLocale,
    targetLanguageCode: data.targetLocale,
  };

  try {
    // Run request
    const [response] = await translationService.translateText(request);

    if (response.translations) {
      for (const translation of response.translations) {
        logger.info(`Translation: ${translation.translatedText}`);
      }
    }
  } catch (e) {
    logger.error(e)
    throw new https.HttpsError('failed-precondition', `Cloud Translation API has not been used in project ${projectId} before or it is disabled`);
  }
  return
});
