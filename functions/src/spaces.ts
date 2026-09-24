import { logger } from 'firebase-functions/v2';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { bucket, firestoreService, ROLE_ADMIN, ROLE_CUSTOM } from './config';
import { AssetKind, ContentKind, Space, SpaceOverviewData } from './models';
import { findAssets, findContents, findSchemas, findSpaceById, findTasks, findTranslations } from './services';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';
import { hasAnyRole } from './utils/user-auth-utils';
import { authUid } from './utils/log-auth';

// Firestore events
const onSpaceDelete = onDocumentDeleted('spaces/{spaceId}', async event => {
  const { id, params, data } = event;
  logger.info(`[Space::onDelete] eventId='${id}'`);
  logger.info(`[Space::onDelete] params='${JSON.stringify(params)}'`);
  const { spaceId } = params;

  if (data) {
    // recursiveDelete removes the space document and all nested subcollections
    logger.info(`[Space::onDelete] data='${JSON.stringify(data)}'`);
    await firestoreService.recursiveDelete(data.ref);
  }
  // delete files
  await bucket.deleteFiles({
    prefix: `spaces/${spaceId}/`,
  });
  return;
});

const calculateOverview = onCall<SpaceOverviewData>(async request => {
  logger.info('[Space::calculateOverview] data: ' + JSON.stringify(request.data));
  logger.info('[Space::calculateOverview] auth uid: ' + authUid(request.auth));
  const { auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'unauthenticated');
  // Same audience as reading the space document: the dashboard recalculates for anyone who opens it.
  if (!hasAnyRole([ROLE_ADMIN, ROLE_CUSTOM], auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId } = request.data;
  // Firestore
  const spaceRef = findSpaceById(spaceId);
  const translationsCount = await findTranslations(spaceId).count().get();
  const assetsCount = await findAssets(spaceId, AssetKind.FILE).count().get();
  const contentsCount = await findContents(spaceId, ContentKind.DOCUMENT).count().get();
  const schemasCount = await findSchemas(spaceId).count().get();
  const tasksCount = await findTasks(spaceId).count().get();
  // Store
  const [translationFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/translations` });
  const translationsSize = translationFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);
  const [assetFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/assets` });
  const assetsSize = assetFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);
  const [contentFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/contents` });
  const contentsSize = contentFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);
  const [taskFiles] = await bucket.getFiles({ prefix: `spaces/${spaceId}/tasks` });
  const taskSize = taskFiles
    .map(it => it.metadata['size'] as string)
    .map(it => Number.parseInt(it))
    .reduce((acc, item) => acc + item, 0);

  const totalSize = [translationsSize, assetsSize, contentsSize, taskSize].reduce((acc, item) => acc + item, 0);

  const update: UpdateData<Space> = {
    overview: {
      translationsCount: translationsCount.data().count,
      translationsSize: translationsSize,
      assetsCount: assetsCount.data().count,
      assetsSize: assetsSize,
      contentsCount: contentsCount.data().count,
      contentsSize: contentsSize,
      tasksCount: tasksCount.data().count,
      tasksSize: taskSize,
      schemasCount: schemasCount.data().count,
      totalSize: totalSize,
      updatedAt: FieldValue.serverTimestamp(),
    },
  };
  return spaceRef.update(update);
});

export const space = {
  ondelete: onSpaceDelete,
  calculateoverview: calculateOverview,
};
