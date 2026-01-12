import { logger } from 'firebase-functions/v2';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { firestoreService } from './config';

const onWebHookDelete = onDocumentDeleted('spaces/{spaceId}/webhooks/{webhookId}', async event => {
  const { id, params, data } = event;
  logger.info(`[WebHook::onDelete] eventId='${id}'`);
  logger.info(`[WebHook::onDelete] params='${JSON.stringify(params)}'`);
  const { spaceId, webhookId } = params;

  if (data) {
    logger.info(`[WebHook::onDelete] spaceId='${spaceId}' webhookId='${webhookId}'`);
    await firestoreService.recursiveDelete(data.ref);
  }
  return;
});

export const webhook = {
  ondelete: onWebHookDelete,
};
