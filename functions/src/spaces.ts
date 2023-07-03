import {logger} from 'firebase-functions/v2';
import {onDocumentDeleted} from 'firebase-functions/v2/firestore';
import {bucket} from './config';

// Firestore events
export const onSpaceDelete = onDocumentDeleted('spaces/{spaceId}', (event) => {
  logger.info(`[Space::onDelete] eventId='${event.id}'`);
  logger.info(`[Task::onDelete] params='${JSON.stringify(event.params)}'`);
  const {spaceId} = event.params;
  return bucket.deleteFiles({
    prefix: `spaces/${spaceId}/`,
  });
});
