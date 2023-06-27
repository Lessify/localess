import {EventContext, firestore, https, logger} from 'firebase-functions';
import {bucket, firestoreService} from './config';
import {QueryDocumentSnapshot} from 'firebase-admin/firestore';
import {Asset, AssetKind, AssetsExportData, AssetsImportData} from './models/asset.model';

// Export
export const assetsExport = https.onCall(async (data: AssetsExportData, context) => {
  logger.info('[assetsExport] data: ' + JSON.stringify(data));
  logger.info('[assetsExport] context.auth: ' + JSON.stringify(context.auth));
});

// Import
export const assetsImport = https.onCall(async (data: AssetsImportData, context) => {
  logger.info('[assetsExport] data: ' + JSON.stringify(data));
  logger.info('[assetsExport] context.auth: ' + JSON.stringify(context.auth));
});

// Firestore events
export const onAssetDelete = firestore.document('spaces/{spaceId}/assets/{assetId}')
  .onDelete(async (snapshot: QueryDocumentSnapshot, context: EventContext) => {
    logger.info(`[Asset::onDelete] eventId='${context.eventId}' id='${snapshot.id}'`);
    const asset = snapshot.data() as Asset;
    logger.info(`[Asset::onDelete] eventId='${context.eventId}' id='${snapshot.id}' name='${asset.name}'`);
    if (asset.kind === AssetKind.FILE) {
      return bucket.deleteFiles({
        prefix: `spaces/${context.params['spaceId']}/assets/${context.params['assetId']}`,
      });
    } else if (asset.kind === AssetKind.FOLDER) {
      // cascade changes to all child's in case it is a FOLDER
      // It will create recursion
      const batch = firestoreService.batch();
      const assetsSnapshot = await firestoreService
        .collection(`spaces/${context.params['spaceId']}/assets`)
        .where('parentPath', '==', asset.parentPath === '' ? snapshot.id : `${asset.parentPath}/${snapshot.id}`)
        .get();
      assetsSnapshot.docs
        .filter((it) => it.exists)
        .forEach((it) => batch.delete(it.ref));
      return batch.commit();
    }
    return;
  });
