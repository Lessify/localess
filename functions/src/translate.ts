import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {firebaseConfig, SUPPORT_LOCALES, translationService,} from './config';
import {TranslateData} from './models/translate.model';
import {protos} from '@google-cloud/translate';
import {UserPermission} from './models/user.model';

export const translate = https.onCall(async (data: TranslateData, context) => {
  logger.info('[translate] data: ' + JSON.stringify(data));
  logger.info('[translate] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.canPerform(UserPermission.TRANSLATION_UPDATE, context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');
  if (!(SUPPORT_LOCALES.has(data.sourceLocale) && SUPPORT_LOCALES.has(data.targetLocale))) throw new https.HttpsError('invalid-argument', 'Unsupported language');


  const projectId = firebaseConfig.projectId;
  let locationId; // firebaseConfig.locationId || 'global'
  if (firebaseConfig.locationId && firebaseConfig.locationId.startsWith('us-')) {
    locationId = 'us-central1';
  } else {
    locationId = 'global';
  }


  const request: protos.google.cloud.translation.v3.ITranslateTextRequest = {
    parent: `projects/${projectId}/locations/${locationId}`,
    contents: [data.content],
    mimeType: 'text/plain',
    sourceLanguageCode: data.sourceLocale,
    targetLanguageCode: data.targetLocale,
  };

  try {
    const [responseTranslateText] = await translationService.translateText(request);

    if (responseTranslateText.translations && responseTranslateText.translations.length > 0) {
      return responseTranslateText.translations[0].translatedText;
    } else {
      return null;
    }
  } catch (e) {
    logger.error(e);
    throw new https.HttpsError('failed-precondition', `Cloud Translation API has not been used in project ${projectId} before or it is disabled`);
  }
});
