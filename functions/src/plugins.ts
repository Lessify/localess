import {logger} from 'firebase-functions/v2';
import {onDocumentCreated, onDocumentDeleted, onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {FieldValue, UpdateData, WithFieldValue} from 'firebase-admin/firestore';
import {firestoreService} from './config';
import {Plugin, PluginContentDefinition, PluginSchemaDefinition} from './models/plugin.model';
import {ContentFolder, ContentKind} from './models/content.model';
import {Schema} from './models/schema.model';
import {shallowEqual} from './utils/object';

const onPluginCreate = onDocumentCreated('spaces/{spaceId}/plugins/{pluginId}', async (event) => {
  logger.info(`[Plugin:onCreate] eventId='${event.id}'`);
  logger.info(`[Plugin:onCreate] params='${JSON.stringify(event.params)}'`);
  const {spaceId, pluginId} = event.params;
  // No Data
  if (!event.data) return;
  const plugin = event.data.data() as Plugin
  logger.info(`[Plugin:onCreate] data='${JSON.stringify(plugin)}'`);
  let batch = firestoreService.batch();
  let count = 0;
  for (const schema of plugin.install?.schemas || []) {
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
    batch.set(firestoreService.doc(`spaces/${spaceId}/schemas/${schema.id}`), add)
    count++;
  }
  for (const content of plugin.install?.contents || []) {
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
      batch.set(firestoreService.doc(`spaces/${spaceId}/contents/${content.id}`), add);
      count++;
    }
  }
  if (count > 0) {
    logger.info('[Plugin:onCreate] batch.commit() : ' + count);
    await batch.commit();
  }
  logger.info(`[Plugin:onCreate] id=${pluginId} finished`);
})
const onPluginUpdate = onDocumentUpdated('spaces/{spaceId}/plugins/{pluginId}', async (event) => {
  logger.info(`[Plugin:onUpdate] eventId='${event.id}'`);
  logger.info(`[Plugin:onUpdate] params='${JSON.stringify(event.params)}'`);
  const {spaceId, pluginId} = event.params;
  // No Data
  if (!event.data) return;
  const before = event.data.before.data() as Plugin;
  const after = event.data.before.data() as Plugin;
  logger.info(`[Plugin:onUpdate] before='${JSON.stringify(before)}'`);
  logger.info(`[Plugin:onUpdate] after='${JSON.stringify(after)}'`);
  let batch = firestoreService.batch();
  let count = 0;
  // Check version
  if (before.version === after.version) {
    // No plugin changes expected, expect configuration changes
    return;
  }
  // Check configuration changes
  if (!shallowEqual(before.configuration, after.configuration)) {
    // TODO check configuration
  }
  // Check Installation schema Updates
  checkSchemaChanges: {
    const beforeMap = new Map<string, PluginSchemaDefinition>(before.install?.schemas?.map(it => [it.id, it]));
    const afterMap = new Map<string, PluginSchemaDefinition>(after.install?.schemas?.map(it => [it.id, it]));
    // Merge all keys
    const allKeys = new Set<string>()
    for (const key of beforeMap.keys()) {
      allKeys.add(key)
    }
    for (const key of afterMap.keys()) {
      allKeys.add(key)
    }
    // Identify changes
    for (const key of allKeys) {
      const beforeHas = beforeMap.has(key)
      const afterHas = afterMap.has(key)
      if (beforeHas && afterHas) {
        // Update
        const schema = afterMap.get(key)
        if (schema) {
          const update: UpdateData<Schema> = {
            name: schema.name,
            displayName: schema.displayName,
            type: schema.type,
            previewField: schema.previewField,
            fields: schema.fields,
            locked: true,
            lockedBy: after.name,
            createdAt: FieldValue.serverTimestamp(),
          }
          batch.update(firestoreService.doc(`spaces/${spaceId}/contents/${schema.id}`), update);
          count++;
        }
      } else if (beforeHas) {
        // Delete
        batch.delete(firestoreService.doc(`spaces/${spaceId}/schemas/${key}`));
        count++;
      } else if (afterHas) {
        // Add
        const schema = afterMap.get(key)
        if (schema) {
          const add: WithFieldValue<Schema> = {
            name: schema.name,
            displayName: schema.displayName,
            type: schema.type,
            previewField: schema.previewField,
            fields: schema.fields,
            locked: true,
            lockedBy: after.name,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }
          batch.set(firestoreService.doc(`spaces/${spaceId}/schemas/${schema.id}`), add)
          count++;
        }
      }
    }
  }
  // Check Installation content Updates
  checkContentChanges: {
    const beforeMap = new Map<string, PluginContentDefinition>(before.install?.contents?.map(it => [it.id, it]));
    const afterMap = new Map<string, PluginContentDefinition>(after.install?.contents?.map(it => [it.id, it]));
    // Merge all keys
    const allKeys = new Set<string>()
    for (const key of beforeMap.keys()) {
      allKeys.add(key)
    }
    for (const key of afterMap.keys()) {
      allKeys.add(key)
    }
    // Identify changes
    for (const key of allKeys) {
      const beforeHas = beforeMap.has(key)
      const afterHas = afterMap.has(key)
      if (beforeHas && afterHas) {
        // Update
        const content = afterMap.get(key)
        if (content && content.kind === ContentKind.FOLDER) {
          const update: UpdateData<ContentFolder> = {
            kind: content.kind,
            name: content.name,
            slug: content.slug,
            parentSlug: content.parentSlug,
            fullSlug: content.fullSlug,
            locked: true,
            lockedBy: after.name,
            updatedAt: FieldValue.serverTimestamp(),
          }
          batch.update(firestoreService.doc(`spaces/${spaceId}/contents/${content.id}`), update);
          count++;
        }
      } else if (beforeHas) {
        // Delete
        batch.delete(firestoreService.doc(`spaces/${spaceId}/contents/${key}`));
        count++;
      } else if (afterHas) {
        // Add
        const content = afterMap.get(key)
        if (content && content.kind === ContentKind.FOLDER) {
          const add: WithFieldValue<ContentFolder> = {
            kind: content.kind,
            name: content.name,
            slug: content.slug,
            parentSlug: content.parentSlug,
            fullSlug: content.fullSlug,
            locked: true,
            lockedBy: after.name,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }
          batch.set(firestoreService.doc(`spaces/${spaceId}/contents/${content.id}`), add, {merge: true});
          count++;
        }
      }
    }
  }
  if (count > 0) {
    logger.info('[Plugin:onUpdate] batch.commit() : ' + count);
    await batch.commit();
  }
  logger.info(`[Plugin:onUpdate] id=${pluginId} finished`);
})
const onPluginDelete = onDocumentDeleted('spaces/{spaceId}/plugins/{pluginId}', async (event) => {
  logger.info(`[Plugin:onDelete] eventId='${event.id}'`);
  logger.info(`[Plugin:onDelete] params='${JSON.stringify(event.params)}'`);
  const {spaceId, pluginId} = event.params;
  // No Data
  if (!event.data) return;
  const plugin = event.data.data() as Plugin
  logger.info(`[Plugin:onCreate] data='${JSON.stringify(plugin)}'`);
  let batch = firestoreService.batch();
  let count = 0;

  for (const schemaId of plugin.uninstall?.schemasIds || []) {
    batch.delete(firestoreService.doc(`spaces/${spaceId}/schemas/${schemaId}`))
    count++;
  }
  for (const contentId of plugin.uninstall?.contentRootIds || []) {
    batch.delete(firestoreService.doc(`spaces/${spaceId}/contents/${contentId}`));
    count++;
  }

  if (count > 0) {
    logger.info('[Plugin:onDelete] batch.commit() : ' + count);
    await batch.commit();
  }
  logger.info(`[Plugin:onDelete] id=${pluginId} finished`);
})

export const plugin = {
  oncreate: onPluginCreate,
  onupdate: onPluginUpdate,
  ondelete: onPluginDelete
};
