import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentDeleted, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, UpdateData, WithFieldValue } from 'firebase-admin/firestore';
import { canPerform } from './utils/security-utils';
import { BATCH_MAX, bucket, firestoreService } from './config';
import {
  Content,
  ContentDocument,
  ContentDocumentStorage,
  ContentHistory,
  ContentHistoryType,
  ContentKind,
  PublishContentData,
  Schema,
  Space,
  UserPermission,
} from './models';
import { extractContent, findContentByFullSlug, findContentById, findContentsHistory, findSchemas, findSpaceById } from './services';

// Publish
const publish = onCall<PublishContentData>(async request => {
  logger.info('[Content::contentPublish] data: ' + JSON.stringify(request.data));
  logger.info('[Content::contentPublish] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.CONTENT_PUBLISH, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId, contentId } = data;
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
        documentStorage.data = extractContent(content.data, schemas, locale.id);
      }
      // Save generated JSON
      logger.info(`[Content::contentPublish] Save file to spaces/${spaceId}/contents/${contentId}/${locale.id}.json`);
      await bucket.file(`spaces/${spaceId}/contents/${contentId}/${locale.id}.json`).save(JSON.stringify(documentStorage));
    }
    // Save Cache
    logger.info(`[Content::contentPublish] Save file to spaces/${spaceId}/contents/${contentId}/cache.json`);
    await bucket.file(`spaces/${spaceId}/contents/${contentId}/cache.json`).save('');
    // Update publishedAt
    await contentSnapshot.ref.update({ publishedAt: FieldValue.serverTimestamp() });
    const addHistory: WithFieldValue<ContentHistory> = {
      type: ContentHistoryType.PUBLISHED,
      name: auth?.token['name'] || FieldValue.delete(),
      email: auth?.token.email || FieldValue.delete(),
      createdAt: FieldValue.serverTimestamp(),
    };
    await findContentsHistory(spaceId, contentId).add(addHistory);
    return;
  } else {
    logger.info(`[Content::contentPublish] Content ${contentId} does not exist.`);
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
  // Logic related to fullSlug change, in case a folder change a SLUG, and it should be cascaded to all childs
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
          documentStorage.data = extractContent(content.data, schemas, locale.id);
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
  let batch = firestoreService.batch();
  let count = 0;
  logger.info(`[Content::onDelete] eventId='${event.id}' delete History`);
  const contentsHistorySnapshot = await findContentsHistory(spaceId, contentId).get();
  for (const item of contentsHistorySnapshot.docs) {
    batch.delete(item.ref);
    count++;
    if (count === BATCH_MAX) {
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  const content = event.data.data() as Content;
  logger.info(`[Content::onDelete] eventId='${event.id}' id='${event.data.id}' fullSlug='${content.fullSlug}'`);
  // Logic related to delete, in case a folder is deleted it should be cascaded to all childs
  if (content.kind === ContentKind.DOCUMENT) {
    await bucket.deleteFiles({
      prefix: `spaces/${spaceId}/contents/${contentId}`,
    });
  } else if (content.kind === ContentKind.FOLDER) {
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    const contentsSnapshot = await findContentByFullSlug(spaceId, content.fullSlug).get();
    for (const item of contentsSnapshot.docs) {
      batch.delete(item.ref);
      count++;
      if (count === BATCH_MAX) {
        await batch.commit();
        batch = firestoreService.batch();
        count = 0;
      }
    }
  }
  if (count > 0) {
    await batch.commit();
  }
  return;
});

const onContentWrite = onDocumentWritten('spaces/{spaceId}/contents/{contentId}', async event => {
  logger.info(`[Content::onWrite] eventId='${event.id}'`);
  logger.info(`[Content::onWrite] params='${JSON.stringify(event.params)}'`);
  const { spaceId, contentId } = event.params;
  // Save Cache, to make sure LINKS are cached correctly with cache version
  logger.info(`[Content::onWrite] Save file to spaces/${spaceId}/contents/cache.json`);
  await bucket.file(`spaces/${spaceId}/contents/cache.json`).save('');
  // History
  // No Data
  if (!event.data) return;
  const { before, after } = event.data;
  const beforeData = before.data() as Content | undefined;
  const afterData = after.data() as Content | undefined;
  let addHistory: WithFieldValue<ContentHistory> = {
    type: ContentHistoryType.PUBLISHED,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (beforeData && afterData) {
    // change
    if (beforeData.kind === ContentKind.DOCUMENT && afterData.kind === ContentKind.DOCUMENT) {
      if (beforeData.publishedAt?.nanoseconds !== afterData.publishedAt?.nanoseconds) {
        // SKIP Publish event
        return;
      }
    }
    addHistory = {
      type: ContentHistoryType.UPDATE,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (beforeData.name !== afterData.name) {
      addHistory.cName = afterData.name;
    }
    if (beforeData.slug !== afterData.slug) {
      addHistory.cSlug = afterData.slug;
    }
    if (beforeData.kind === ContentKind.DOCUMENT && afterData.kind === ContentKind.DOCUMENT) {
      if (JSON.stringify(beforeData.data) !== JSON.stringify(afterData.data)) {
        addHistory.cData = true;
      }
    }
  } else if (afterData) {
    // create
    addHistory = {
      type: ContentHistoryType.CREATE,
      cName: afterData.name,
      cSlug: afterData.slug,
      createdAt: FieldValue.serverTimestamp(),
    };
  } else if (beforeData) {
    // delete : skip history
    return;
  }
  if (afterData?.updatedBy) {
    addHistory.email = afterData.updatedBy.email;
    addHistory.name = afterData.updatedBy.name;
  }

  await findContentsHistory(spaceId, contentId).add(addHistory);
  return;
});

export const content = {
  publish: publish,
  onupdate: onContentUpdate,
  ondelete: onContentDelete,
  onwrite: onContentWrite,
};
