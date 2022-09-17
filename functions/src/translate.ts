import {https, logger} from 'firebase-functions';
import {SecurityUtils} from './utils/security-utils';
import {ROLE_ADMIN, ROLE_EDIT, ROLE_WRITE, } from './config';
//import {protos} from '@google-cloud/translate';

interface TranslateData {
  content: string
  sourceLocale: string
  targetLocale: string
}

export const translate = https.onCall(async (data: TranslateData, context) => {
  logger.info('[translate] data: ' + JSON.stringify(data));
  logger.info('[translate] context.auth: ' + JSON.stringify(context.auth));
  if (!SecurityUtils.hasAnyRole([ROLE_EDIT, ROLE_WRITE, ROLE_ADMIN], context.auth)) throw new https.HttpsError('permission-denied', 'permission-denied');

  logger.info(JSON.stringify(process.env['FIREBASE_CONFIG']))
  logger.info(JSON.stringify(process.env['GCLOUD_PROJECT']))

  return process.env

  // const request: protos.google.cloud.translation.v3.ITranslateTextRequest = {
  //   //parent: `projects/${projectId}/locations/${location}`,
  //   contents: [data.content],
  //   mimeType: 'text/plain',
  //   sourceLanguageCode: data.sourceLocale,
  //   targetLanguageCode: data.targetLocale,
  // };
  //
  // // Run request
  // const [response] = await translationService.translateText(request);
  //
  // if (response.translations) {
  //   for (const translation of response.translations) {
  //     logger.info(`Translation: ${translation.translatedText}`);
  //   }
  // }

});
