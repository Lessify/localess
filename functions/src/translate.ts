import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { canPerform } from './utils/user-auth-utils';
import { TranslateData, UserPermission } from './models';
import { translateCloud } from './services/translate.service';
import { isEmulatorEnabled } from './config';

export const translate = onCall<TranslateData>(async request => {
  logger.info('[translate] data: ' + JSON.stringify(request.data));
  logger.info('[translate] context.auth: ' + JSON.stringify(request.auth));
  const { content, sourceLocale, targetLocale, format } = request.data;
  if (!canPerform(UserPermission.TRANSLATION_UPDATE, request.auth) || !canPerform(UserPermission.CONTENT_UPDATE, request.auth)) {
    throw new HttpsError('permission-denied', 'permission-denied');
  }
  if (isEmulatorEnabled) {
    // The stub has to stay valid for the format it was asked for: appending the marker as plain
    // text to html content would feed the editor a stray text node outside any block.
    if (format === 'html') {
      return `${content}<p><em>${sourceLocale} -&gt; ${targetLocale}</em></p>`;
    }
    return `${content} : ${sourceLocale} -> ${targetLocale}`;
  } else {
    return await translateCloud(content, sourceLocale, targetLocale, format);
  }
});
