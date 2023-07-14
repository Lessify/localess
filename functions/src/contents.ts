import {logger} from 'firebase-functions/v2';
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentDeleted, onDocumentUpdated, onDocumentWritten} from "firebase-functions/v2/firestore";
import {FieldValue} from 'firebase-admin/firestore';
import {SecurityUtils} from './utils/security-utils';
import {bucket, firestoreService} from './config';
import {Space} from './models/space.model';
import {Content, ContentKind, ContentDocument, ContentDocumentStorage, PublishContentData} from './models/content.model';
import {Schema} from './models/schema.model';
import {UserPermission} from './models/user.model';
import {findContentByFullSlug, findContentById} from "./services/content.service";
import {findSpaceById} from "./services/space.service";
import {findSchemas} from "./services/schema.service";

// Publish
export const contentPublish = onCall<PublishContentData>(async (request) => {
  logger.info('[contentPublish] data: ' + JSON.stringify(request.data));
  logger.info('[contentPublish] context.auth: ' + JSON.stringify(request.auth));
  if (!SecurityUtils.canPerform(UserPermission.CONTENT_PUBLISH, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const {spaceId, contentId} = request.data
  const spaceSnapshot = await findSpaceById(spaceId).get();
  const contentSnapshot = await findContentById(spaceId,contentId).get();
  const schemasSnapshot = await findSchemas(spaceId).get();
  if (spaceSnapshot.exists && contentSnapshot.exists) {
    const space: Space = spaceSnapshot.data() as Space;
    const content: ContentDocument = contentSnapshot.data() as ContentDocument;
    const schemas = schemasSnapshot.docs.filter((it) => it.exists).map((it) => it.data() as Schema);
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
        documentStorage.data = {
          _id: content.data._id,
          schema: content.data.schema,
        };
        const schema = schemas.find((it) => it.name == content.data?.schema);
        for (const field of schema?.fields || []) {
          if (field.translatable) {
            let value = content.data[`${field.name}_i18n_${locale.id}`];
            if (!value) {
              value = content.data[`${field.name}_i18n_${space.localeFallback.id}`];
            }
            documentStorage.data[field.name] = value;
          } else {
            documentStorage.data[field.name] = content.data[field.name];
          }
        }
      }

      // Save generated JSON
      logger.info(`[contentPublish] Save file to spaces/${spaceId}/contents/${contentId}/${locale.id}.json`);
      bucket.file(`spaces/${spaceId}/contents/${contentId}/${locale.id}.json`)
        .save(
          JSON.stringify(documentStorage),
          (err?: Error | null) => {
            if (err) {
              logger.error(`[contentPublish] Can not save file for Space(${spaceId}), Content(${contentId}) and Locale(${locale})`);
              logger.error(err);
            }
          }
        );
    }
    // Save Cache
    logger.info(`[contentPublish] Save file to spaces/${spaceId}/contents/${contentId}/cache.json`);
    await bucket.file(`spaces/${spaceId}/contents/${contentId}/cache.json`).save('');
    // Update publishedAt
    await contentSnapshot.ref.update({publishedAt: FieldValue.serverTimestamp()});
    return;
  } else {
    logger.info(`[contentPublish] Content ${contentId} does not exist.`);
    throw new HttpsError('not-found', 'Content not found');
  }
});

// Firestore events
export const onContentUpdate = onDocumentUpdated('spaces/{spaceId}/contents/{contentId}', async (event) => {
  logger.info(`[Asset::onUpdate] eventId='${event.id}'`);
  logger.info(`[Asset::onUpdate] params='${JSON.stringify(event.params)}'`);
  const {spaceId, contentId} = event.params;
  // No Data
  if (!event.data) return;
  const contentBefore = event.data.before.data() as Content;
  const contentAfter = event.data.after.data() as Content;
  logger.info(`[Content::onUpdate] eventId='${event.id}' id='${contentId}' slug before='${contentBefore.fullSlug}' after='${contentAfter.fullSlug}'`);
  // First level check, check if the slug is different
  if (contentBefore.fullSlug === contentAfter.fullSlug) {
    logger.info(`[Content::onUpdate] eventId='${event.id}' id='${contentId}' has no changes in fullSlug`);
  } else {
    // In case it is a PAGE, skip recursion as PAGE doesn't have child
    if (contentAfter.kind === ContentKind.DOCUMENT) return;
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    const batch = firestoreService.batch();
    const contentsSnapshot = await findContentByFullSlug(spaceId, contentBefore.fullSlug).get();
    contentsSnapshot.docs.filter((it) => it.exists)
      .forEach((it) => {
        const content = it.data() as Content;
        const update = {
          parentSlug: contentAfter.fullSlug,
          fullSlug: `${contentAfter.fullSlug}/${content.slug}`,
        };
        batch.update(it.ref, update);
      });
    return batch.commit();
  }
  return;
});

export const onContentDelete = onDocumentDeleted('spaces/{spaceId}/contents/{contentId}', async (event) => {
  logger.info(`[Content::onDelete] eventId='${event.id}'`);
  logger.info(`[Content::onDelete] params='${JSON.stringify(event.params)}'`);
  const {spaceId, contentId} = event.params;
  // No Data
  if (!event.data) return;
  const content = event.data.data() as Content;
  logger.info(`[Content::onDelete] eventId='${event.id}' id='${event.data.id}' fullSlug='${content.fullSlug}'`);
  if (content.kind === ContentKind.DOCUMENT) {
    return bucket.deleteFiles({
      prefix: `spaces/${spaceId}/contents/${contentId}`,
    });
  } else if (content.kind === ContentKind.FOLDER) {
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    const batch = firestoreService.batch();
    const contentsSnapshot = await findContentByFullSlug(spaceId,content.fullSlug).get();
    contentsSnapshot.docs.filter((it) => it.exists)
      .forEach((it) => batch.delete(it.ref));
    return batch.commit();
  }
  return;
});

export const onContentWrite = onDocumentWritten('spaces/{spaceId}/contents/{contentId}', async  (event) => {
  logger.info(`[Content::onWrite] eventId='${event.id}'`);
  logger.info(`[Content::onWrite] params='${JSON.stringify(event.params)}'`);
  const {spaceId} = event.params;
  // Save Cache
  logger.info(`[Content::onWrite] Save file to spaces/${spaceId}/contents/cache.json`);
  await bucket.file(`spaces/${spaceId}/contents/cache.json`).save('');
  return;
});
