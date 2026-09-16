import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { canPerform } from './utils/user-auth-utils';
import { TranslateBatchResult, TranslateData, UserPermission } from './models';
import { translateCloud } from './services/translate.service';
import { translateItems } from './utils/translate-batch';
import { isEmulatorEnabled } from './config';

export const translate = onCall<TranslateData>(async request => {
  logger.info('[translate] data: ' + JSON.stringify(request.data));
  logger.info('[translate] context.auth: ' + JSON.stringify(request.auth));
  const data = request.data;
  const { sourceLocale, targetLocale } = data;
  if (!canPerform(UserPermission.TRANSLATION_UPDATE, request.auth) || !canPerform(UserPermission.CONTENT_UPDATE, request.auth)) {
    throw new HttpsError('permission-denied', 'permission-denied');
  }

  // Narrows the request union: `items` is declared on both sides, so reading it off the union is
  // allowed, and the false branch is a TranslateSingleData.
  if (data.items) {
    if (isEmulatorEnabled) {
      return {
        items: data.items.map(it => ({
          id: it.id,
          content:
            it.format === 'html'
              ? `${it.content}<p><em>${sourceLocale} -&gt; ${targetLocale}</em></p>`
              : `${it.content} : ${sourceLocale} -> ${targetLocale}`,
        })),
        failed: [],
      } satisfies TranslateBatchResult;
    }
    return await translateItems(data.items, sourceLocale, targetLocale);
  }

  const { content, format } = data;
  // The union rules this out for callers, but a callable's payload is untrusted at runtime.
  if (content === undefined) {
    throw new HttpsError('invalid-argument', 'Either content or items is required.');
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
