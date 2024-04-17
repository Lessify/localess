import { logger } from 'firebase-functions/v2';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { BATCH_MAX, bucket, firestoreService } from './config';
import { Asset, AssetKind } from './models';
import { findAllAssetsByParentPath } from './services';

// Firestore events
const onAssetDeleted = onDocumentDeleted('spaces/{spaceId}/assets/{assetId}', async event => {
  logger.info(`[Asset::onDelete] eventId='${event.id}'`);
  logger.info(`[Asset::onDelete] params='${JSON.stringify(event.params)}'`);
  const { spaceId, assetId } = event.params;
  // No Data
  if (!event.data) return;
  const asset = event.data.data() as Asset;
  logger.info(`[Asset::onDelete] eventId='${event.id}' id='${event.data.id}' name='${asset.name}'`);
  if (asset.kind === AssetKind.FILE) {
    return bucket.deleteFiles({
      prefix: `spaces/${spaceId}/assets/${assetId}`,
    });
  } else if (asset.kind === AssetKind.FOLDER) {
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    let batch = firestoreService.batch();
    let count = 0;
    const parentPath = asset.parentPath === '' ? event.data.id : `${asset.parentPath}/${event.data.id}`;
    const assetsSnapshot = await findAllAssetsByParentPath(spaceId, parentPath).get();
    for (const item of assetsSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    // Clean history batch
    if (count > 0) {
      await batch.commit();
    }
    return;
  }
  return;
});

export const asset = {
  ondelete: onAssetDeleted,
};
