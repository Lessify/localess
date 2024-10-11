import { logger } from 'firebase-functions/v2';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onCall } from 'firebase-functions/v2/https';
import { BATCH_MAX, bucket, firestoreService } from './config';
import { AssetKind, ContentKind, Space, SpaceOverviewData } from './models';
import {
  findAssets,
  findContents,
  findPlugins,
  findSchemas,
  findSpaceById,
  findTasks,
  findTokens,
  findTranslations,
  findTranslationsHistory,
} from './services';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';

// Firestore events
const onSpaceDelete = onDocumentDeleted('spaces/{spaceId}', async event => {
  const { id, params, data } = event;
  logger.info(`[Space::onDelete] eventId='${id}'`);
  logger.info(`[Space::onDelete] params='${JSON.stringify(params)}'`);
  const { spaceId } = params;

  if (data) {
    // Recursive delete
    logger.info(`[Space::onDelete] data='${JSON.stringify(data)}'`);
    await firestoreService.recursiveDelete(data.ref);
  } else {
    // Batch delete
    let batch = firestoreService.batch();
    let count = 0;
    // Assets
    const assetsSnapshot = await findAssets(spaceId).get();
    logger.info(`[Space::onDelete] Assets size='${assetsSnapshot.docs.length}'`);
    for (const item of assetsSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Contents
    const contentsSnapshot = await findContents(spaceId).get();
    logger.info(`[Space::onDelete] Contents size='${contentsSnapshot.docs.length}'`);
    for (const item of contentsSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Plugins
    const pluginsSnapshot = await findPlugins(spaceId).get();
    logger.info(`[Space::onDelete] plugins size='${pluginsSnapshot.docs.length}'`);
    for (const item of pluginsSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Schemas
    const schemasSnapshot = await findSchemas(spaceId).get();
    logger.info(`[Space::onDelete] Schemas size='${schemasSnapshot.docs.length}'`);
    for (const item of schemasSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Tasks
    const tasksSnapshot = await findTasks(spaceId).get();
    logger.info(`[Space::onDelete] Tasks size='${tasksSnapshot.docs.length}'`);
    for (const item of tasksSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Tokens
    const tokensSnapshot = await findTokens(spaceId).get();
    logger.info(`[Space::onDelete] Tokens size='${tokensSnapshot.docs.length}'`);
    for (const item of tokensSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Translations
    const translationsSnapshot = await findTranslations(spaceId).get();
    logger.info(`[Space::onDelete] Translations size='${translationsSnapshot.docs.length}'`);
    for (const item of translationsSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
    // Translations History
    const translationsHistorySnapshot = await findTranslationsHistory(spaceId).get();
    logger.info(`[Space::onDelete] Translations History size='${translationsHistorySnapshot.docs.length}'`);
    for (const item of translationsHistorySnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  }
  // delete files
  await bucket.deleteFiles({
    prefix: `spaces/${spaceId}/`,
  });
  return;
});

const calculateOverview = onCall<SpaceOverviewData>(async request => {
  logger.info('[Space::calculateOverview] data: ' + JSON.stringify(request.data));
  logger.info('[Space::calculateOverview] context.auth: ' + JSON.stringify(request.auth));
  const { spaceId } = request.data;
  // Firestore
  const spaceRef = findSpaceById(spaceId);
  const translationsCount = await findTranslations(spaceId).count().get();
  const assetsCount = await findAssets(spaceId, AssetKind.FILE).count().get();
  const contentsCount = await findContents(spaceId, ContentKind.DOCUMENT).count().get();
  const schemasCount = await findSchemas(spaceId).count().get();
  // Store
  const [translationFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/translations` });
  const translationSize = translationFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);
  const [assetFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/assets` });
  const assetsSize = assetFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);
  const [contentFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/contents` });
  const contentSize = contentFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);

  const update: UpdateData<Space> = {
    overview: {
      translationsCount: translationsCount.data().count,
      translationSize: translationSize,
      assetsCount: assetsCount.data().count,
      assetsSize: assetsSize,
      contentsCount: contentsCount.data().count,
      contentSize: contentSize,
      schemasCount: schemasCount.data().count,
      updatedAt: FieldValue.serverTimestamp(),
    },
  };
  return spaceRef.update(update);
});

export const space = {
  ondelete: onSpaceDelete,
  calculateoverview: calculateOverview,
};
