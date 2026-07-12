import { logger } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentDeleted, onDocumentUpdated, onDocumentWritten, DocumentSnapshot } from 'firebase-functions/v2/firestore';
import { FieldValue, UpdateData } from 'firebase-admin/firestore';
import { canPerform } from './utils/user-auth-utils';
import { bucket, firestoreService } from './config';
import {
  Content,
  ContentData,
  ContentDocument,
  ContentDocumentStorage,
  ContentKind,
  PublishContentData,
  Schema,
  SchemaComponent,
  SchemaFieldKind,
  SchemaType,
  Space,
  TranslateContentLocaleData,
  UserPermission,
  WebHookEvent,
  WebHookPayload,
} from './models';
import {
  extractContent,
  findAllContentsByParentSlug,
  findContentById,
  findDocumentsToPublishByParentSlug,
  findSchemas,
  findSpaceById,
  spaceContentCachePath,
} from './services';
import { translateWithGoogle } from './services/translate.service';
import { triggerWebHooksForEvent } from './utils/webhook-utils';
import { isSchemaFieldKindAITranslatable } from './utils/translate.utils';

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
    const content: Content = contentSnapshot.data() as Content;
    const schemas = new Map(schemasSnapshot.docs.map(it => [it.id, it.data() as Schema]));
    if (content.kind === ContentKind.DOCUMENT) {
      await publishDocument(spaceId, space, contentId, content, contentSnapshot, schemas);
    } else if (content.kind === ContentKind.FOLDER) {
      const documentsSnapshot = await findDocumentsToPublishByParentSlug(spaceId, content.fullSlug).get();
      for (const documentSnapshot of documentsSnapshot.docs) {
        const document = documentSnapshot.data() as ContentDocument;
        const isAlreadyPublished = document.publishedAt ? document.publishedAt.seconds > document.updatedAt.seconds : false;
        logger.info('[Content::contentPublish] check', document.fullSlug, 'isAlreadyPublished', isAlreadyPublished);
        // SKIP if the page was already published, by comparing publishedAt and updatedAt
        if (isAlreadyPublished) continue;
        await publishDocument(spaceId, space, documentSnapshot.id, document, documentSnapshot, schemas);
      }
    }

    // Trigger webhooks for content published event
    const webhookPayload: WebHookPayload = {
      event: WebHookEvent.CONTENT_PUBLISHED,
      spaceId,
      timestamp: new Date().toISOString(),
      data: {
        id: contentId,
        fullSlug: content.fullSlug,
      },
    };
    await triggerWebHooksForEvent(spaceId, webhookPayload);

    return;
  } else {
    logger.info(`[Content::contentPublish] Content ${contentId} does not exist.`);
    throw new HttpsError('not-found', 'Content not found');
  }
});

/**
 * Build and save a ContentDocumentStorage JSON file for every locale in the space.
 * Extracts locale-specific content and copies assets, links, and references onto
 * the storage object. The caller controls the destination path via pathFn (published
 * vs draft) and whether publishedAt is stamped.
 * @param {Space} space Space containing the locale list
 * @param {string} documentId Content document identifier
 * @param {ContentDocument} document Source Firestore content document
 * @param {Map<string, Schema>} schemas Schema map used for locale extraction
 * @param {Function} pathFn Maps a locale ID to the Cloud Storage path for that file
 * @param {string} publishedAt ISO timestamp to stamp as publishedAt; omit for draft saves
 */
async function buildDocumentStorageForLocales(
  space: Space,
  documentId: string,
  document: ContentDocument,
  schemas: Map<string, Schema>,
  pathFn: (localeId: string) => string,
  publishedAt?: string
): Promise<void> {
  for (const locale of space.locales) {
    const documentStorage: ContentDocumentStorage = {
      id: documentId,
      name: document.name,
      kind: document.kind,
      locale: locale.id,
      slug: document.slug,
      fullSlug: document.fullSlug,
      parentSlug: document.parentSlug,
      createdAt: document.createdAt.toDate().toISOString(),
      updatedAt: document.updatedAt.toDate().toISOString(),
    };
    if (publishedAt) {
      documentStorage.publishedAt = publishedAt;
    }
    if (document.data) {
      if (typeof document.data === 'string') {
        documentStorage.data = extractContent(JSON.parse(document.data), schemas, locale.id);
      } else {
        documentStorage.data = extractContent(document.data, schemas, locale.id);
      }
    }
    if (document.assets && document.assets.length > 0) {
      documentStorage.assets = document.assets;
    }
    if (document.links && document.links.length > 0) {
      documentStorage.links = document.links;
    }
    if (document.references && document.references.length > 0) {
      documentStorage.references = document.references;
    }
    const path = pathFn(locale.id);
    logger.info(`[Content] Save file to ${path}`);
    await bucket.file(path).save(JSON.stringify(documentStorage));
  }
}

/**
 * Publish a content document: writes locale JSON files to Cloud Storage
 * and stamps publishedAt on the Firestore document.
 * @param {string} spaceId Space identifier
 * @param {Space} space Space containing locale list
 * @param {string} documentId Content document identifier
 * @param {ContentDocument} document Source Firestore content document
 * @param {DocumentSnapshot} documentSnapshot Firestore snapshot used to update publishedAt
 * @param {Map<string, Schema>} schemas Schema map used for locale extraction
 */
async function publishDocument(
  spaceId: string,
  space: Space,
  documentId: string,
  document: ContentDocument,
  documentSnapshot: DocumentSnapshot,
  schemas: Map<string, Schema>
) {
  await buildDocumentStorageForLocales(
    space,
    documentId,
    document,
    schemas,
    localeId => `spaces/${spaceId}/contents/${documentId}/${localeId}.json`,
    new Date().toISOString()
  );
  // Update publishedAt
  await documentSnapshot.ref.update({ publishedAt: FieldValue.serverTimestamp() });
}

// Unpublish
const unpublish = onCall<PublishContentData>(async request => {
  logger.info('[Content::contentUnpublish] data: ' + JSON.stringify(request.data));
  logger.info('[Content::contentUnpublish] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.CONTENT_PUBLISH, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId, contentId } = data;
  const spaceSnapshot = await findSpaceById(spaceId).get();
  const contentSnapshot = await findContentById(spaceId, contentId).get();
  if (spaceSnapshot.exists && contentSnapshot.exists) {
    const space: Space = spaceSnapshot.data() as Space;
    const content: Content = contentSnapshot.data() as Content;
    if (content.kind === ContentKind.DOCUMENT) {
      await unpublishDocument(spaceId, space, contentId, contentSnapshot);
    } else if (content.kind === ContentKind.FOLDER) {
      const documentsSnapshot = await findDocumentsToPublishByParentSlug(spaceId, content.fullSlug).get();
      for (const documentSnapshot of documentsSnapshot.docs) {
        const document = documentSnapshot.data() as ContentDocument;
        // SKIP if the document is not published
        if (!document.publishedAt) continue;
        await unpublishDocument(spaceId, space, documentSnapshot.id, documentSnapshot);
      }
    }

    // Trigger webhooks for content unpublished event
    const webhookPayload: WebHookPayload = {
      event: WebHookEvent.CONTENT_UNPUBLISHED,
      spaceId,
      timestamp: new Date().toISOString(),
      data: {
        id: contentId,
        fullSlug: content.fullSlug,
      },
    };
    await triggerWebHooksForEvent(spaceId, webhookPayload);

    return;
  } else {
    logger.info(`[Content::contentUnpublish] Content ${contentId} does not exist.`);
    throw new HttpsError('not-found', 'Content not found');
  }
});

/**
 * Unpublish Document
 * @param {string} spaceId space id
 * @param {Space} space
 * @param {string} documentId
 * @param {DocumentSnapshot} documentSnapshot
 */
async function unpublishDocument(spaceId: string, space: Space, documentId: string, documentSnapshot: DocumentSnapshot) {
  for (const locale of space.locales) {
    // Delete published JSON files
    logger.info(`[Content::contentUnpublish] Delete file spaces/${spaceId}/contents/${documentId}/${locale.id}.json`);
    try {
      await bucket.file(`spaces/${spaceId}/contents/${documentId}/${locale.id}.json`).delete();
    } catch (error) {
      logger.warn(`[Content::contentUnpublish] File not found or already deleted: ${error}`);
    }
  }
  // Clear publishedAt timestamp
  await documentSnapshot.ref.update({ publishedAt: FieldValue.delete() });
}

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
      const document: ContentDocument = contentAfter;
      const schemas = new Map(schemasSnapshot.docs.map(it => [it.id, it.data() as Schema]));
      await buildDocumentStorageForLocales(
        space,
        contentId,
        document,
        schemas,
        localeId => `spaces/${spaceId}/contents/${contentId}/draft/${localeId}.json`
      );

      // Trigger webhooks for content saved/updated event
      const webhookPayload: WebHookPayload = {
        event: WebHookEvent.CONTENT_CHANGED,
        spaceId,
        timestamp: new Date().toISOString(),
        data: {
          id: contentId,
          fullSlug: contentAfter.fullSlug,
        },
      };
      await triggerWebHooksForEvent(spaceId, webhookPayload);
    }
  } else {
    // In case it is a PAGE, skip recursion as PAGE doesn't have child
    if (contentAfter.kind === ContentKind.DOCUMENT) return;
    // cascade changes to all child's in case it is a FOLDER
    // It will create recursion
    const bulk = firestoreService.bulkWriter();
    const contentsSnapshot = await findAllContentsByParentSlug(spaceId, contentBefore.fullSlug).get();
    for (const item of contentsSnapshot.docs) {
      const content = item.data() as Content;
      const update: UpdateData<Content> = {
        parentSlug: contentAfter.fullSlug,
        fullSlug: `${contentAfter.fullSlug}/${content.slug}`,
        updatedAt: FieldValue.serverTimestamp(),
      };
      bulk.update(item.ref, update);
    }
    await bulk.close();
    return;
  }
  return;
});

const onContentDelete = onDocumentDeleted('spaces/{spaceId}/contents/{contentId}', async event => {
  logger.info(`[Content::onDelete] eventId='${event.id}'`);
  logger.info(`[Content::onDelete] params='${JSON.stringify(event.params)}'`);
  const { spaceId, contentId } = event.params;
  // No Data
  if (!event.data) return;

  // Delete the document and all nested subcollections
  logger.info(`[Content::onDelete] eventId='${event.id}' delete document and subcollections`);
  await firestoreService.recursiveDelete(event.data.ref);

  const content = event.data.data() as Content;
  logger.info(`[Content::onDelete] eventId='${event.id}' id='${event.data.id}' fullSlug='${content.fullSlug}'`);

  // Trigger webhooks for content deleted event
  const webhookPayload: WebHookPayload = {
    event: WebHookEvent.CONTENT_CHANGED,
    spaceId,
    timestamp: new Date().toISOString(),
    data: {
      id: contentId,
      fullSlug: content.fullSlug,
    },
  };
  await triggerWebHooksForEvent(spaceId, webhookPayload);

  // Logic related to delete, in case a folder is deleted it should be cascaded to all children
  if (content.kind === ContentKind.DOCUMENT) {
    await bucket.deleteFiles({
      prefix: `spaces/${spaceId}/contents/${contentId}`,
    });
  } else if (content.kind === ContentKind.FOLDER) {
    // cascade delete to all content documents that use this folder as parent (sibling documents, not subcollections)
    const folderBulk = firestoreService.bulkWriter();
    const contentsSnapshot = await findAllContentsByParentSlug(spaceId, content.fullSlug).get();
    contentsSnapshot.docs.forEach(item => folderBulk.delete(item.ref));
    await folderBulk.close();
  }
  return;
});

const onContentWrite = onDocumentWritten('spaces/{spaceId}/contents/{contentId}', async event => {
  logger.info(`[Content::onWrite] eventId='${event.id}'`);
  logger.info(`[Content::onWrite] params='${JSON.stringify(event.params)}'`);
  const { spaceId } = event.params;
  // Save Cache, to make sure LINKS are cached correctly with cache version
  logger.info(`[Content::onWrite] Save file to ${spaceContentCachePath(spaceId)}`);
  await bucket.file(spaceContentCachePath(spaceId)).save('');
  return;
});

/**
 * Recursively collect translatable fields that have a source value but no target translation.
 * Each task carries the source value and a setter that writes the translation directly into parsedData.
 * @param {ContentData} data Parsed content data node (mutated in-place via setters)
 * @param {Map<string, Schema>} schemas Schema map
 * @param {string} sourceLocaleId Source locale identifier
 * @param {string} targetLocaleId Target locale identifier
 * @return {Array} List of { fieldName, sourceValue, setter } entries
 */
function collectTranslatableTasks(
  data: ContentData,
  schemas: Map<string, Schema>,
  sourceLocaleId: string | undefined,
  targetLocaleId: string
): Array<{ fieldName: string; sourceValue: string; setter: (value: string) => void }> {
  const tasks: Array<{ fieldName: string; sourceValue: string; setter: (value: string) => void }> = [];
  const schema = schemas.get(data.schema);
  if (!schema || (schema.type !== SchemaType.ROOT && schema.type !== SchemaType.NODE)) return tasks;

  for (const field of (schema as SchemaComponent).fields || []) {
    if (!isSchemaFieldKindAITranslatable(field.kind)) {
      continue;
    }
    if (field.kind === SchemaFieldKind.SCHEMA) {
      const nested: ContentData | undefined = data[field.name];
      if (nested) {
        tasks.push(...collectTranslatableTasks(nested, schemas, sourceLocaleId, targetLocaleId));
      }
    } else if (field.kind === SchemaFieldKind.SCHEMAS) {
      const items: ContentData[] | undefined = data[field.name];
      if (Array.isArray(items)) {
        for (const item of items) {
          tasks.push(...collectTranslatableTasks(item, schemas, sourceLocaleId, targetLocaleId));
        }
      }
    } else if (field.translatable) {
      const targetKey = `${field.name}_i18n_${targetLocaleId}`;
      const sourceValue: string | undefined = sourceLocaleId ? data[`${field.name}_i18n_${sourceLocaleId}`] : data[field.name];
      const targetValue: string | undefined = data[targetKey];
      if (sourceValue && !targetValue) {
        tasks.push({ fieldName: field.name, sourceValue, setter: value => (data[targetKey] = value) });
      }
    }
  }
  return tasks;
}

// Translate Content Locale
const translateLocale = onCall<TranslateContentLocaleData>(async request => {
  logger.info('[Content::translateLocale] data: ' + JSON.stringify(request.data));
  logger.info('[Content::translateLocale] context.auth: ' + JSON.stringify(request.auth));
  const { auth, data } = request;
  if (!canPerform(UserPermission.CONTENT_UPDATE, auth)) throw new HttpsError('permission-denied', 'permission-denied');
  const { spaceId, contentId, sourceLocaleId, targetLocaleId } = data;

  const [contentSnapshot, schemasSnapshot] = await Promise.all([findContentById(spaceId, contentId).get(), findSchemas(spaceId).get()]);

  if (!contentSnapshot.exists) {
    logger.info(`[Content::translateLocale] Content ${contentId} does not exist.`);
    throw new HttpsError('not-found', 'Content not found');
  }

  const document = contentSnapshot.data() as ContentDocument;
  if (document.kind !== ContentKind.DOCUMENT || !document.data) {
    logger.info(`[Content::translateLocale] Content ${contentId} has no translatable data.`);
    return;
  }

  const schemas = new Map(schemasSnapshot.docs.map(it => [it.id, it.data() as Schema]));
  const parsedData: ContentData = typeof document.data === 'string' ? JSON.parse(document.data) : document.data;
  const tasks = collectTranslatableTasks(parsedData, schemas, sourceLocaleId, targetLocaleId);

  if (tasks.length === 0) {
    logger.info(`[Content::translateLocale] No translatable fields found for content ${contentId}.`);
    return;
  }

  // Translate all fields concurrently
  const results = await Promise.all(
    tasks.map(async ({ fieldName, sourceValue, setter }) => {
      try {
        const translatedValue = await translateWithGoogle(sourceValue, sourceLocaleId, targetLocaleId);
        return { fieldName, setter, translatedValue };
      } catch (e) {
        logger.error(`[Content::translateLocale] Failed to translate field '${fieldName}': ${e}`);
        return { fieldName, setter, translatedValue: null };
      }
    })
  );

  // Apply translated values back into parsedData via setters, then persist as JSON string
  let counter = 0;
  for (const { setter, translatedValue } of results) {
    if (translatedValue) {
      setter(translatedValue);
      counter++;
    }
  }
  await contentSnapshot.ref.update({ data: JSON.stringify(parsedData), updatedAt: FieldValue.serverTimestamp() });
  logger.info(`[Content::translateLocale] Successfully updated ${counter} fields for content ${contentId}.`);
});

export const content = {
  publish: publish,
  unpublish: unpublish,
  onupdate: onContentUpdate,
  ondelete: onContentDelete,
  onwrite: onContentWrite,
  translatelocale: translateLocale,
};
