import {logger} from 'firebase-functions/v2';
import {HttpsError, onCall} from 'firebase-functions/v2/https';
import {onDocumentDeleted, onDocumentUpdated, onDocumentWritten} from 'firebase-functions/v2/firestore';
import {FieldValue, UpdateData} from 'firebase-admin/firestore';
import {SecurityUtils} from './utils/security-utils';
import {bucket, firestoreService} from './config';
import {Space} from './models/space.model';
import {Content, ContentData, ContentDocument, ContentDocumentStorage, ContentKind, PublishContentData} from './models/content.model';
import {Schema, SchemaFieldKind} from './models/schema.model';
import {UserPermission} from './models/user.model';
import {findContentByFullSlug, findContentById} from './services/content.service';
import {findSpaceById} from './services/space.service';
import {findSchemas} from './services/schema.service';

// Publish
const contentPublish = onCall<PublishContentData>(async (request) => {
  logger.info('[contentPublish] data: ' + JSON.stringify(request.data));
  logger.info('[contentPublish] context.auth: ' + JSON.stringify(request.auth));
  if (!SecurityUtils.canPerform(UserPermission.CONTENT_PUBLISH, request.auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const {spaceId, contentId} = request.data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  const contentSnapshot = await findContentById(spaceId, contentId).get();
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
        // documentStorage.data = {
        //   _id: content.data._id,
        //   schema: content.data.schema,
        // };
        // const schema = schemas.find((it) => it.name == content.data?.schema);
        documentStorage.data = extractContent(content.data, schemas, locale.id, space.localeFallback.id);
        // for (const field of schema?.fields || []) {
        //   if (field.translatable) {
        //     let value = content.data[`${field.name}_i18n_${locale.id}`];
        //     if (!value) {
        //       value = content.data[`${field.name}_i18n_${space.localeFallback.id}`];
        //     }
        //     documentStorage.data[field.name] = value;
        //   } else {
        //     documentStorage.data[field.name] = content.data[field.name];
        //   }
        // }
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
const onContentUpdate = onDocumentUpdated('spaces/{spaceId}/contents/{contentId}', async (event) => {
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

const onContentDelete = onDocumentDeleted('spaces/{spaceId}/contents/{contentId}', async (event) => {
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
    const contentsSnapshot = await findContentByFullSlug(spaceId, content.fullSlug).get();
    contentsSnapshot.docs.filter((it) => it.exists)
      .forEach((it) => batch.delete(it.ref));
    return batch.commit();
  }
  return;
});

const onContentWrite = onDocumentWritten('spaces/{spaceId}/contents/{contentId}', async (event) => {
  logger.info(`[Content::onWrite] eventId='${event.id}'`);
  logger.info(`[Content::onWrite] params='${JSON.stringify(event.params)}'`);
  const {spaceId} = event.params;
  // Save Cache
  logger.info(`[Content::onWrite] Save file to spaces/${spaceId}/contents/cache.json`);
  await bucket.file(`spaces/${spaceId}/contents/cache.json`).save('');
  return;
});

/**
 * extract Locale Content
 * @param {ContentData} content content
 * @param {Schema[]} schemas schema
 * @param {string} locale locale
 * @param {string} localeFallback fallback locale
 * @return {ContentData} content
 */
function extractContent(content: ContentData, schemas: Schema[], locale: string, localeFallback: string): ContentData {
  const extractedContentData : ContentData = {
    _id: content._id,
    schema: content.schema,
  };
  const schema = schemas.find((it) => it.name == content.schema);
  for (const field of schema?.fields || []) {
    if (field.kind === SchemaFieldKind.SCHEMA) {
      extractedContentData[field.name] = extractContent(content[field.name], schemas, locale, localeFallback);
    } else if (field.kind === SchemaFieldKind.SCHEMAS) {
      if (Array.isArray(content[field.name])) {
        extractedContentData[field.name] = (content[field.name] as (ContentData[] | undefined))?.map((it) => extractContent(it, schemas, locale, localeFallback));
      }
    } else {
      if (field.translatable) {
        let value = content[`${field.name}_i18n_${locale}`];
        if (!value) {
          value = content[`${field.name}_i18n_${localeFallback}`];
        }
        extractedContentData[field.name] = value;
      } else {
        extractedContentData[field.name] = content[field.name];
      }
    }
  }
  return extractedContentData;
}

export const content = {
  publish: contentPublish,
  onupdate: onContentUpdate,
  ondelete: onContentDelete,
  onwrite: onContentWrite,
};
