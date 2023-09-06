import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {logger} from 'firebase-functions/v2';
import {FieldValue, WithFieldValue} from 'firebase-admin/firestore';
import {firestoreService} from './config';
import {Plugin} from './models/plugin.model';
import {ContentFolder, ContentKind} from './models/content.model';
import {Schema} from './models/schema.model';

const onPluginCreate = onDocumentCreated('spaces/{spaceId}/plugins/{pluginId}', async (event) => {
  logger.info(`[Plugin:onPluginCreate] eventId='${event.id}'`);
  logger.info(`[Plugin:onPluginCreate] params='${JSON.stringify(event.params)}'`);
  const {spaceId, pluginId} = event.params;
  // No Data
  if (!event.data) return;
  const plugin = event.data.data() as Plugin
  logger.info(`[Plugin:onPluginCreate] data='${JSON.stringify(plugin)}'`);
  let batch = firestoreService.batch();
  let count = 0;
  for (const schema of plugin.schemas || []) {
    const add: WithFieldValue<Schema> = {
      name: schema.name,
      displayName: schema.displayName,
      type: schema.type,
      previewField: schema.previewField,
      fields: schema.fields,
      locked: true,
      lockedBy: plugin.name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    batch.set(firestoreService.doc(`spaces/${spaceId}/schemas/${schema.id}`), add, {merge: true})
    count++;
  }
  for (const content of plugin.contents || []) {
    if (content.kind === ContentKind.FOLDER) {
      const add: WithFieldValue<ContentFolder> = {
        kind: content.kind,
        name: content.name,
        slug: content.slug,
        parentSlug: content.parentSlug,
        fullSlug: content.fullSlug,
        locked: true,
        lockedBy: plugin.name,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
      batch.set(firestoreService.doc(`spaces/${spaceId}/contents/${content.id}`), add, {merge: true});
    }
    count++;
  }
  if (count > 0) {
    logger.info('[Plugin:onPluginCreate] batch.commit() : ' + count);
    await batch.commit();
  }
  logger.info(`[Plugin:onPluginCreate] id=${pluginId} finished`);
})
const onPluginUpdate = onDocumentUpdated('spaces/{spaceId}/plugins/{pluginId}', async (event) => {
  logger.info(`[Plugin:onPluginUpdate] eventId='${event.id}'`);
  logger.info(`[Plugin:onPluginUpdate] params='${JSON.stringify(event.params)}'`);
  //const {spaceId, pluginId} = event.params;
  // No Data
  if (!event.data) return;
  const before = event.data.before.data() as Plugin;
  const after = event.data.before.data() as Plugin;
  logger.info(`[Plugin:onPluginUpdate] before='${JSON.stringify(before)}'`);
  logger.info(`[Plugin:onPluginUpdate] after='${JSON.stringify(after)}'`);
})
const onPluginDelete = onDocumentDeleted('spaces/{spaceId}/plugins/{pluginId}', async (event) => {
  logger.info(`[Plugin:onPluginDelete] eventId='${event.id}'`);
  logger.info(`[Plugin:onPluginDelete] params='${JSON.stringify(event.params)}'`);
  //const {spaceId, pluginId} = event.params;
})

export const plugin = {
  oncreate: onPluginCreate,
  onupdate: onPluginUpdate,
  ondelete: onPluginDelete
};
