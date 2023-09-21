import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentDeleted, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';
import { canPerform } from './utils/security-utils';
import { bucket, firestoreService } from './config';
import { Space } from './models/space.model';
import { Content, ContentDocument, ContentDocumentStorage, ContentKind, PublishContentData } from './models/content.model';
import { Schema } from './models/schema.model';
import { UserPermission } from './models/user.model';
import { extractContent, findContentByFullSlug, findContentById } from './services/content.service';
import { findSpaceById } from './services/space.service';
import { findSchemas } from './services/schema.service';

// Publish
const contentPublish = onCall<PublishContentData>(async request => {
  logger.info('[contentPublish] data: ' + JSON.stringify(request.data));
  logger.info('[contentPublish] context.auth: ' + JSON.stringify(request.auth));
  if (!canPerform(UserPermission.CONTENT_PUBLISH, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId, contentId } = request.data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  const contentSnapshot = await findContentById(spaceId, contentId).get();
  const schemasSnapshot = await findSchemas(spaceId).get();
  if (spaceSnapshot.exists && contentSnapshot.exists) {
    const space: Space = spaceSnapshot.data() as Space;
    const content: ContentDocument = contentSnapshot.data() as ContentDocument;
    const schemas = schemasSnapshot.docs.filter(it => it.exists).map(it => it.data() as Schema);
    for (const locale of space.locales) {
      const documentStorage: ContentDocumentStorage = {
        id: contentSnapshot.id,
        name: content.name,
        locale: locale.id,
        slug: content.slug,
        fullSlug: content.fullSlug,
        parentSlug: content.parentSlug,
        createdAt: content.createdAt.toDate().toISOString(),
        updatedAt: content.updatedAt.toDate().toISOString(),
        publishedAt: new Date().toISOString(),
      };
      if (content.data) {
        documentStorage.data = extractContent(content.data, schemas, locale.id, space.localeFallback.id);
      }
      // Save generated JSON
      logger.info(`[contentPublish] Save file to spaces/${spaceId}/contents/${contentId}/${locale.id}.json`);
      await bucket.file(`spaces/${spaceId}/contents/${contentId}/${locale.id}.json`).save(JSON.stringify(documentStorage));
    }
    // Save Cache
    logger.info(`[contentPublish] Save file to spaces/${spaceId}/contents/${contentId}/cache.json`);
    await bucket.file(`spaces/${spaceId}/contents/${contentId}/cache.json`).save('');
    // Update publishedAt
    await contentSnapshot.ref.update({ publishedAt: FieldValue.serverTimestamp() });
    return;
  } else {
    logger.info(`[contentPublish] Content ${contentId} does not exist.`);
    throw new HttpsError('not-found', 'Content not found');
  }
});

// Firestore events
const onContentUpdate = onDocumentUpdated('spaces/{spaceId}/contents/{contentId}', async event => {
  logger.info(`[Content::onUpdate] eventId='${event.id}'`);
  logger.info(`[Content::onUpdate] params='${JSON.stringify(event.params)}'`);
  const { spaceId, contentId } = event.params;
  // No Data
  if (!event.data) return;
  const contentBefore = event.data.before.data() as Content;
  const contentAfter = event.data.after.data() as Content;
  logger.info(
    `[Content::onUpdate] eventId='${event.id}' id='${contentId}' slug before='${contentBefore.fullSlug}' after='${contentAfter.fullSlug}'`
  );
  // Logic related to fullSlug change, in case a folder change a SLUG and it should be cascaded to all childs
  // First level check, check if the slug is different
  if (contentBefore.fullSlug === contentAfter.fullSlug) {
    logger.info(`[Content::onUpdate] eventId='${event.id}' id='${contentId}' has no changes in fullSlug`);
    // No Slug change => content change for DOCUMENT.
    if (contentBefore.kind === ContentKind.DOCUMENT && contentAfter.kind === ContentKind.DOCUMENT) {
      if (contentBefore.publishedAt?.seconds !== contentAfter.publishedAt?.seconds) {
        logger.info(`[Content::onUpdate] eventId='${event.id}' id='${contentId}' has different publishedAt, it is publish event`);
        return;
      }
      const spaceSnapshot = await findSpaceById(spaceId).get();
      const schemasSnapshot = await findSchemas(spaceId).get();
      const space: Space = spaceSnapshot.data() as Space;
      const content: ContentDocument = contentAfter;
      const schemas = schemasSnapshot.docs.filter(it => it.exists).map(it => it.data() as Schema);
      for (const locale of space.locales) {
        const documentStorage: ContentDocumentStorage = {
          id: event.data.after.id,
          name: content.name,
          locale: locale.id,
          slug: content.slug,
          fullSlug: content.fullSlug,
          parentSlug: content.parentSlug,
          createdAt: content.createdAt.toDate().toISOString(),
          updatedAt: content.updatedAt.toDate().toISOString(),
        };
        if (content.data) {
          documentStorage.data = extractContent(content.data, schemas, locale.id, space.localeFallback.id);
        }
        // Save generated JSON
        logger.info(`[Content::onUpdate] Save file to spaces/${spaceId}/contents/${contentId}/draft/${locale.id}.json`);
        await bucket.file(`spaces/${spaceId}/contents/${contentId}/draft/${locale.id}.json`).save(JSON.stringify(documentStorage));
        // Save Cache
        logger.info(`[Content::onUpdate] Save file to spaces/${spaceId}/contents/${contentId}/draft/cache.json`);
        await bucket.file(`spaces/${spaceId}/contents/${contentId}/draft/cache.json`).save('');
      }
    }
  } else {
    // In case it is a PAGE, skip recursion as PAGE doesn't have child
    if (contentAfter.kind === ContentKind.DOCUMENT) return;
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    const batch = firestoreService.batch();
    const contentsSnapshot = await findContentByFullSlug(spaceId, contentBefore.fullSlug).get();
    contentsSnapshot.docs
      .filter(it => it.exists)
      .forEach(it => {
        const content = it.data() as Content;
        const update: UpdateData<Content> = {
          parentSlug: contentAfter.fullSlug,
          fullSlug: `${contentAfter.fullSlug}/${content.slug}`,
          updatedAt: FieldValue.serverTimestamp(),
        };
        batch.update(it.ref, update);
      });
    return batch.commit();
  }
  return;
});

const onContentDelete = onDocumentDeleted('spaces/{spaceId}/contents/{contentId}', async event => {
  logger.info(`[Content::onDelete] eventId='${event.id}'`);
  logger.info(`[Content::onDelete] params='${JSON.stringify(event.params)}'`);
  const { spaceId, contentId } = event.params;
  // No Data
  if (!event.data) return;
  const content = event.data.data() as Content;
  logger.info(`[Content::onDelete] eventId='${event.id}' id='${event.data.id}' fullSlug='${content.fullSlug}'`);
  // Logic related to delete, in case a folder is deleted it should be cascaded to all childs
  if (content.kind === ContentKind.DOCUMENT) {
    return bucket.deleteFiles({
      prefix: `spaces/${spaceId}/contents/${contentId}`,
    });
  } else if (content.kind === ContentKind.FOLDER) {
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    const batch = firestoreService.batch();
    const contentsSnapshot = await findContentByFullSlug(spaceId, content.fullSlug).get();
    contentsSnapshot.docs.filter(it => it.exists).forEach(it => batch.delete(it.ref));
    return batch.commit();
  }
  return;
});

const onContentWrite = onDocumentWritten('spaces/{spaceId}/contents/{contentId}', async event => {
  logger.info(`[Content::onWrite] eventId='${event.id}'`);
  logger.info(`[Content::onWrite] params='${JSON.stringify(event.params)}'`);
  const { spaceId } = event.params;
  // Save Cache, to make sure LINKS are cached correctly with caceh version
  logger.info(`[Content::onWrite] Save file to spaces/${spaceId}/contents/cache.json`);
  await bucket.file(`spaces/${spaceId}/contents/cache.json`).save('');
  return;
});

export const content = {
  publish: contentPublish,
  onupdate: onContentUpdate,
  ondelete: onContentDelete,
  onwrite: onContentWrite,
};
