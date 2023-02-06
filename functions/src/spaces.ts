import {EventContext, firestore, logger} from 'firebase-functions';
import {QueryDocumentSnapshot} from 'firebase-admin/firestore';
import {bucket} from './config';

// Firestore events
export const onSpaceDelete = firestore.document('spaces/{spaceId}')
  .onDelete((snapshot: QueryDocumentSnapshot, context: EventContext) => {
    logger.info(`[Space::onDelete] eventId='${context.eventId}' id='${snapshot.id}'`);
    return bucket.deleteFiles({
      prefix: `spaces/${snapshot.id}/`,
    });
  });
