import {logger} from 'firebase-functions/v2';
import {onDocumentDeleted} from 'firebase-functions/v2/firestore';
import {bucket, firestoreService} from './config';
import {Asset, AssetKind} from './models/asset.model';

// Firestore events
export const onAssetDeleted = onDocumentDeleted('spaces/{spaceId}/assets/{assetId}', async (event) => {
  logger.info(`[Asset::onDelete] eventId='${event.id}'`);
  logger.info(`[Asset::onDelete] params='${JSON.stringify(event.params)}'`);
  const {spaceId, assetId} = event.params;
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
    const batch = firestoreService.batch();
    const assetsSnapshot = await firestoreService
      .collection(`spaces/${spaceId}/assets`)
      .where('parentPath', '==', asset.parentPath === '' ? event.data.id : `${asset.parentPath}/${event.data.id}`)
      .get();
    assetsSnapshot.docs
      .filter((it) => it.exists)
      .forEach((it) => batch.delete(it.ref));
    return batch.commit();
  }
  return;
});
