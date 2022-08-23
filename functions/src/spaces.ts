import {EventContext, firestore, logger} from 'firebase-functions';
import {QueryDocumentSnapshot} from 'firebase-admin/firestore';
import {bucket} from './config';

// Firestore events
export const onSpaceDelete = firestore.document('spaces/{spaceId}')
  .onDelete((snapshot: QueryDocumentSnapshot, context: EventContext) => {
    logger.info(`[Space::onDelete] id='${snapshot.id}' exists=${snapshot.exists} eventId='${context.eventId}'`);
    return bucket.deleteFiles({
      prefix: `spaces/${snapshot.id}/`,
    });
  });
