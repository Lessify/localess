import {logger} from 'firebase-functions/v2';
import {onDocumentCreated, onDocumentDeleted} from 'firebase-functions/v2/firestore';
import {Task, TaskExportMetadata, TaskKind, TaskStatus} from './models/task.model';
import {FieldValue, UpdateData, WithFieldValue} from 'firebase-admin/firestore';
import {bucket, firestoreService} from './config';
import {Asset, AssetExport, AssetFile, AssetFolder, AssetKind} from './models/asset.model';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {zip} from 'compressing';
import {ErrorObject} from 'ajv';
import {findAssetById, findAssets, validateAssetImport} from './services/asset.service';
import {
  Content,
  ContentDocument,
  ContentDocumentExport,
  ContentExport,
  ContentFolder,
  ContentFolderExport,
  ContentKind,
} from './models/content.model';
import {findContentById, findContents, validateContentImport} from './services/content.service';
import {tmpdir} from 'os';
import {Schema, SchemaExport} from './models/schema.model';
import {findSchemaById, findSchemas, validateSchemaImport} from './services/schema.service';
import {Translation, TranslationExport} from './models/translation.model';
import {findTranslationById, findTranslations, validateTranslationImport} from './services/translation.service';

const TMP_TASK_FOLDER = `${tmpdir()}/task`;

// Firestore events
export const onTaskCreate = onDocumentCreated('spaces/{spaceId}/tasks/{taskId}', async (event) => {
  logger.info(`[Task::onTaskCreate] eventId='${event.id}'`);
  logger.info(`[Task::onTaskCreate] params='${JSON.stringify(event.params)}'`);
  logger.info(`[Task::onTaskCreate] tmp-task-folder='${TMP_TASK_FOLDER}'`);
  const {spaceId, taskId} = event.params;
  // No Data
  if (!event.data) return;
  const task = event.data.data() as Task;
  logger.info(`[Task::onTaskCreate] task='${JSON.stringify(task)}'`);
  // Proceed only with INITIATED Tasks
  if (task.status !== TaskStatus.INITIATED) return;

  const updateToInProgress: UpdateData<Task> = {
    status: TaskStatus.IN_PROGRESS,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (task.kind.endsWith('_IMPORT')) {
    if (task.tmpPath) {
      const newPath = `spaces/${spaceId}/tasks/${taskId}/original`;
      await bucket.file(task.tmpPath).move(newPath);
      updateToInProgress.tmpPath = FieldValue.delete();
    }
  }
  // Update to IN_PROGRESS
  logger.info(`[Task::onTaskCreate] update='${JSON.stringify(updateToInProgress)}'`);
  await event.data.ref.update(updateToInProgress);
  // Run Task
  const updateToFinished: UpdateData<Task> = {
    status: TaskStatus.FINISHED,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (task.kind === TaskKind.ASSET_EXPORT) {
    const metadata = await assetsExport(spaceId, taskId, task);
    logger.info(`[Task::onTaskCreate] metadata='${JSON.stringify(metadata)}'`);
    updateToFinished['file'] = {
      name: `asset-export-${taskId}.lla.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.ASSET_IMPORT) {
    const errors = await assetsImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Asset Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Asset data is invalid.';
      }
    }
  } else if (task.kind === TaskKind.CONTENT_EXPORT) {
    const metadata = await contentsExport(spaceId, taskId, task);
    updateToFinished['file'] = {
      name: `content-export-${taskId}.llc.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.CONTENT_IMPORT) {
    const errors = await contentsImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Content Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Content data is invalid.';
      }
    }
  } else if (task.kind === TaskKind.SCHEMA_EXPORT) {
    const metadata = await schemasExport(spaceId, taskId, task);
    updateToFinished['file'] = {
      name: `schema-export-${taskId}.lls.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.SCHEMA_IMPORT) {
    const errors = await schemasImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Schema Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Schema data is invalid.';
      }
    }
  } else if (task.kind === TaskKind.TRANSLATION_EXPORT) {
    const metadata = await translationsExport(spaceId, taskId, task);
    updateToFinished['file'] = {
      name: `translation-export-${taskId}.llt.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.TRANSLATION_IMPORT) {
    const errors = await translationsImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Translation Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Translation data is invalid.';
      }
    }
  }
  // Export Finished
  logger.info(`[Task::onTaskCreate] update='${JSON.stringify(updateToFinished)}'`);
  await event.data.ref.update(updateToFinished);
});

/**
 * assetExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function assetsExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportAssets: AssetExport[] = [];
  const assetsSnapshot = await findAssets(spaceId, task.fromDate).get();
  assetsSnapshot.docs.filter((it) => it.exists)
    .forEach((doc) => {
      const asset = doc.data() as Asset;
      if (asset.kind === AssetKind.FOLDER) {
        exportAssets.push({
          id: doc.id,
          kind: AssetKind.FOLDER,
          name: asset.name,
          parentPath: asset.parentPath,
        } as AssetExport);
      } else if (asset.kind === AssetKind.FILE) {
        exportAssets.push({
          id: doc.id,
          kind: AssetKind.FILE,
          name: asset.name,
          parentPath: asset.parentPath,
          extension: asset.extension,
          type: asset.type,
          size: asset.size,
          alt: asset.alt,
          metadata: asset.metadata,
        } as AssetExport);
      }
    });
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const fileMetadata: TaskExportMetadata = {
    kind: 'ASSET',
    fromDate: task.fromDate,
  };
  // Create TMP Folder
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/assets.json`, JSON.stringify(exportAssets));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  // Create assets folder
  const assetsTmpFolder = `${tmpTaskFolder}/assets`;
  const assetsExportZipFile = `${tmpdir()}/assets-${taskId}.zip`;
  mkdirSync(assetsTmpFolder);

  await Promise.all(
    exportAssets.filter((it) => it.kind === AssetKind.FILE)
      .map((asset) =>
        bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`)
          .download({destination: `${assetsTmpFolder}/${asset.id}`})
      )
  );

  await zip.compressDir(tmpTaskFolder, assetsExportZipFile, {ignoreBase: true});

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`)
    .save(
      readFileSync(assetsExportZipFile),
      (err) => {
        if (err) {
          logger.error(err);
        }
      });
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * assetImport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function assetsImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({destination: zipPath});
  await zip.uncompress(zipPath, tmpTaskFolder);
  const assets = JSON.parse(readFileSync(`${tmpTaskFolder}/assets.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'ASSET') return 'WRONG_METADATA';
  const errors = validateAssetImport(assets);
  if (errors) {
    logger.warn(`[Task::onTaskCreate] invalid=${JSON.stringify(errors)}`);
    return errors;
  }
  logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(assets)}`);
  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const asset of assets as AssetExport[]) {
    const assetRef = findAssetById(spaceId, asset.id);
    const assetSnapshot = await assetRef.get();
    // Skip Existing Files
    if (assetSnapshot.exists) continue;
    if (asset.kind === AssetKind.FILE) {
      // Skip if file is not present
      const assetTmpPath = `${tmpTaskFolder}/assets/${asset.id}`;
      if (!existsSync(assetTmpPath)) continue;
      const add: WithFieldValue<AssetFile> = {
        kind: AssetKind.FILE,
        name: asset.name,
        parentPath: asset.parentPath,
        uploaded: false,
        extension: asset.extension,
        type: asset.type,
        size: asset.size,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      // Optional Fields
      if (asset.alt) add.alt = asset.alt;
      if (asset.metadata) add.metadata = asset.metadata;
      bulk.set(assetRef, add)
        .then(() => {
          logger.info(`[Task::onTaskCreate] Save File ${asset.id}`);
          bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`).save(readFileSync(assetTmpPath));
        });
    } else if (asset.kind === AssetKind.FOLDER) {
      const add: WithFieldValue<AssetFolder> = {
        kind: AssetKind.FOLDER,
        name: asset.name,
        parentPath: asset.parentPath,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      bulk.set(assetRef, add);
    }
    totalChanges++;
  }
  await bulk.close();
  logger.info('[Task::onTaskCreate] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function contentsExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportContents: ContentExport[] = [];
  const contentsSnapshot = await findContents(spaceId, task.fromDate).get();
  contentsSnapshot.docs.filter((it) => it.exists)
    .forEach((doc) => {
      const content = doc.data() as Content;
      if (content.kind === ContentKind.FOLDER) {
        exportContents.push({
          id: doc.id,
          kind: ContentKind.FOLDER,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
        } as ContentFolderExport);
      } else if (content.kind === ContentKind.DOCUMENT) {
        exportContents.push({
          id: doc.id,
          kind: ContentKind.DOCUMENT,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          schema: content.schema,
          data: content.data,
        } as ContentDocumentExport);
      }
    });
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const fileMetadata: TaskExportMetadata = {
    kind: 'CONTENT',
    fromDate: task.fromDate,
  };
  // Create TMP Folder
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/contents.json`, JSON.stringify(exportContents));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  // Create assets folder
  const contentsExportZipFile = `${tmpdir()}/contents-${taskId}.zip`;

  await zip.compressDir(tmpTaskFolder, contentsExportZipFile, {ignoreBase: true});

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`)
    .save(
      readFileSync(contentsExportZipFile),
      (err) => {
        if (err) {
          logger.error(err);
        }
      });
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function contentsImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({destination: zipPath});
  await zip.uncompress(zipPath, tmpTaskFolder);
  const contents = JSON.parse(readFileSync(`${tmpTaskFolder}/contents.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'CONTENT') return 'WRONG_METADATA';
  const errors = validateContentImport(contents);
  if (errors) {
    logger.warn(`[Task::onTaskCreate] invalid=${JSON.stringify(errors)}`);
    return errors;
  }
  logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(contents)}`);
  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const content of contents as ContentExport[]) {
    const contentRef = findContentById(spaceId, content.id);
    const contentSnapshot = await contentRef.get();
    if (contentSnapshot.exists) {
      // Update Content
      if (content.kind === ContentKind.DOCUMENT) {
        const update: UpdateData<ContentDocument> = {
          kind: ContentKind.DOCUMENT,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          schema: content.schema,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (content.data) update.data = content.data;
        bulk.update(contentRef, update);
      } else if (content.kind === ContentKind.FOLDER) {
        const update: UpdateData<ContentFolder> = {
          kind: ContentKind.FOLDER,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          updatedAt: FieldValue.serverTimestamp(),
        };
        bulk.update(contentRef, update);
      }
    } else {
      // Add Content
      if (content.kind === ContentKind.DOCUMENT) {
        const add: WithFieldValue<ContentDocument> = {
          kind: ContentKind.DOCUMENT,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          schema: content.schema,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (content.data) add.data = content.data;
        bulk.set(contentRef, add);
      } else if (content.kind === ContentKind.FOLDER) {
        const add: WithFieldValue<ContentFolder> = {
          kind: ContentKind.FOLDER,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        bulk.set(contentRef, add);
      }
    }
    totalChanges++;
  }
  await bulk.close();
  logger.info('[Task::onTaskCreate] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function schemasExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportSchemas: SchemaExport[] = [];
  const schemasSnapshot = await findSchemas(spaceId, task.fromDate).get();
  schemasSnapshot.docs.filter((it) => it.exists)
    .forEach((doc) => {
      const schema = doc.data() as Schema;
      exportSchemas.push({
        id: doc.id,
        name: schema.name,
        type: schema.type,
        displayName: schema.displayName,
        fields: schema.fields,
      });
    });
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const fileMetadata: TaskExportMetadata = {
    kind: 'SCHEMA',
    fromDate: task.fromDate,
  };
  // Create TMP Folder
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/schemas.json`, JSON.stringify(exportSchemas));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  // Create assets folder
  const schemasExportZipFile = `${tmpdir()}/schemas-${taskId}.zip`;

  await zip.compressDir(tmpTaskFolder, schemasExportZipFile, {ignoreBase: true});

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`)
    .save(
      readFileSync(schemasExportZipFile),
      (err) => {
        if (err) {
          logger.error(err);
        }
      });
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function schemasImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({destination: zipPath});
  await zip.uncompress(zipPath, tmpTaskFolder);
  const schemas = JSON.parse(readFileSync(`${tmpTaskFolder}/schemas.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'SCHEMA') return 'WRONG_METADATA';
  const errors = validateSchemaImport(schemas);
  if (errors) {
    logger.warn(`[Task::onTaskCreate] invalid=${JSON.stringify(errors)}`);
    return errors;
  }
  logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(schemas)}`);
  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const schema of schemas as SchemaExport[]) {
    const schemaRef = findSchemaById(spaceId, schema.id);
    const schemaSnapshot = await schemaRef.get();
    if (schemaSnapshot.exists) {
      const update: UpdateData<Schema> = {
        name: schema.name,
        type: schema.type,
        displayName: schema.displayName || FieldValue.delete(),
        fields: schema.fields || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      bulk.update(schemaRef, update);
    } else {
      const add: WithFieldValue<Schema> = {
        name: schema.name,
        type: schema.type,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (schema.displayName) add.displayName = schema.displayName;
      if (schema.fields) add.fields = schema.fields;
      bulk.set(schemaRef, add);
    }
    totalChanges++;
  }
  await bulk.close();
  logger.info('[Task::onTaskCreate] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportTranslations: TranslationExport[] = [];
  const translationsSnapshot = await findTranslations(spaceId, task.fromDate).get();
  translationsSnapshot.docs.filter((it) => it.exists)
    .forEach((doc) => {
      const translation = doc.data() as Translation;
      const exportedTr: TranslationExport = {
        id: doc.id,
        name: translation.name,
        type: translation.type,
        locales: translation.locales,
      };
      if (translation.labels && translation.labels.length > 0) {
        exportedTr.labels = translation.labels;
      }
      if (translation.description && translation.description.length > 0) {
        exportedTr.description = translation.description;
      }
      exportTranslations.push(exportedTr);
    });
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const fileMetadata: TaskExportMetadata = {
    kind: 'TRANSLATION',
    fromDate: task.fromDate,
  };
  // Create TMP Folder
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/translations.json`, JSON.stringify(exportTranslations));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  // Create assets folder
  const translationsExportZipFile = `${tmpdir()}/translations-${taskId}.zip`;

  await zip.compressDir(tmpTaskFolder, translationsExportZipFile, {ignoreBase: true});

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`)
    .save(
      readFileSync(translationsExportZipFile),
      (err) => {
        if (err) {
          logger.error(err);
        }
      });
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function translationsImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({destination: zipPath});
  await zip.uncompress(zipPath, tmpTaskFolder);
  const translations = JSON.parse(readFileSync(`${tmpTaskFolder}/translations.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'TRANSLATION') return 'WRONG_METADATA';
  const errors = validateTranslationImport(translations);
  if (errors) {
    logger.warn(`[Task::onTaskCreate] invalid=${JSON.stringify(errors)}`);
    return errors;
  }
  logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(translations)}`);
  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const translation of translations as TranslationExport[]) {
    const translationRef = findTranslationById(spaceId, translation.id);
    const translationSnapshot = await translationRef.get();
    if (translationSnapshot.exists) {
      const update: UpdateData<Translation> = {
        name: translation.name,
        type: translation.type,
        locales: translation.locales,
        description: translation.description || FieldValue.delete(),
        labels: translation.labels || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      bulk.update(translationRef, update);
    } else {
      const add: WithFieldValue<Translation> = {
        name: translation.name,
        type: translation.type,
        locales: translation.locales,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (translation.description) add.description = translation.description;
      if (translation.labels) add.labels = translation.labels;
      bulk.set(translationRef, add);
    }
    totalChanges++;
  }
  await bulk.close();
  logger.info('[Task::onTaskCreate] bulk total changes : ' + totalChanges);
  return undefined;
}

export const onTaskDeleted = onDocumentDeleted('spaces/{spaceId}/tasks/{taskId}', async (event) => {
  logger.info(`[Task::onTaskDeleted] eventId='${event.id}'`);
  logger.info(`[Task::onTaskDeleted] params='${JSON.stringify(event.params)}'`);
  const {spaceId, taskId} = event.params;
  return bucket.deleteFiles({
    prefix: `spaces/${spaceId}/tasks/${taskId}`,
  });
});
