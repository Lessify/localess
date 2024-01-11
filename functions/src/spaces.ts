import { logger } from 'firebase-functions/v2';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { bucket } from './config';
import { onCall } from 'firebase-functions/v2/https';
import { AssetKind, ContentKind, Space, SpaceOverviewData } from './models';
import { findAssets, findContents, findSchemas, findSpaceById, findTranslations } from './services';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';

// Firestore events
const onSpaceDelete = onDocumentDeleted('spaces/{spaceId}', event => {
  logger.info(`[Space::onDelete] eventId='${event.id}'`);
  logger.info(`[Space::onDelete] params='${JSON.stringify(event.params)}'`);
  const { spaceId } = event.params;
  return bucket.deleteFiles({
    prefix: `spaces/${spaceId}/`,
  });
  // TODO delete all sub collections
  // assets
  // contents
  // plugins
  // schemas
  // tasks
  // tokens
  // translations
  // translations_history
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
