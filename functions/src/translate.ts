import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { canPerform } from './utils/security-utils';
import { TranslateData, UserPermission } from './models';
import { translateCloud } from './services/translate.service';

export const translate = onCall<TranslateData>(async request => {
  logger.info('[translate] data: ' + JSON.stringify(request.data));
  logger.info('[translate] context.auth: ' + JSON.stringify(request.auth));
  const { content, sourceLocale, targetLocale } = request.data;
  if (!canPerform(UserPermission.TRANSLATION_UPDATE, request.auth) || !canPerform(UserPermission.CONTENT_UPDATE, request.auth)) {
    throw new HttpsError('permission-denied', 'permission-denied');
  }
  return await translateCloud(content, sourceLocale, targetLocale);
});
