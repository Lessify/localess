import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { protos } from '@google-cloud/translate';
import { canPerform } from './utils/security-utils';
import { firebaseConfig, SUPPORT_LOCALES, translationService } from './config';
import { TranslateData, UserPermission } from './models';

export const translate = onCall<TranslateData>(async request => {
  logger.info('[translate] data: ' + JSON.stringify(request.data));
  logger.info('[translate] context.auth: ' + JSON.stringify(request.auth));
  const { content, sourceLocale, targetLocale } = request.data;
  if (!canPerform(UserPermission.TRANSLATION_UPDATE, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  if (sourceLocale && !SUPPORT_LOCALES.has(sourceLocale)) {
    throw new HttpsError('invalid-argument', `Unsupported source locale : '${sourceLocale}'`);
  }
  if (!SUPPORT_LOCALES.has(targetLocale)) {
    throw new HttpsError('invalid-argument', `Unsupported target locale : '${targetLocale}'`);
  }

  const projectId = firebaseConfig.projectId;
  let locationId; // firebaseConfig.locationId || 'global'
  if (firebaseConfig.locationId && firebaseConfig.locationId.startsWith('us-')) {
    locationId = 'us-central1';
  } else {
    locationId = 'global';
  }

  const tRequest: protos.google.cloud.translation.v3.ITranslateTextRequest = {
    parent: `projects/${projectId}/locations/${locationId}`,
    contents: [content],
    mimeType: 'text/plain',
    sourceLanguageCode: sourceLocale,
    targetLanguageCode: targetLocale,
  };

  try {
    const [responseTranslateText] = await translationService.translateText(tRequest);

    if (responseTranslateText.translations && responseTranslateText.translations.length > 0) {
      return responseTranslateText.translations[0].translatedText;
    } else {
      return null;
    }
  } catch (e) {
    logger.error(e);
    throw new HttpsError('failed-precondition', `Cloud Translation API has not been used in project ${projectId} before or it is disabled`);
  }
});
