import { logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { FieldValue, UpdateData, WithFieldValue } from 'firebase-admin/firestore';
import {
  Asset,
  AssetExport,
  AssetFile,
  AssetFolder,
  AssetKind,
  Content,
  ContentDocument,
  ContentExport,
  ContentFolder,
  ContentKind,
  Schema,
  SchemaComponent,
  SchemaEnum,
  SchemaExport,
  SchemaType,
  Task,
  TaskExportMetadata,
  TaskKind,
  TaskStatus,
  Translation,
  TranslationExport,
  TranslationType,
  zAssetExportArraySchema,
  zContentExportArraySchema,
  zSchemaExportArraySchema,
  zTranslationExportArraySchema,
  zTranslationFlatExportSchema,
} from './models';
import { BATCH_MAX, bucket, firestoreService } from './config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { zip } from 'compressing';
import {
  docAssetToExport,
  docContentToExport,
  findAssetById,
  findAssets,
  findAssetsByStartFullSlug,
  findContentByFullSlug,
  findContentById,
  findContents,
  findContentsByStartFullSlug,
  findSchemaById,
  findSchemas,
  findTranslationById,
  findTranslations,
  updateMetadataByRef,
} from './services';
import { tmpdir } from 'os';
import { ZodError } from 'zod';

const TMP_TASK_FOLDER = `${tmpdir()}/task-`;

// Firestore events
const onTaskCreate = onDocumentCreated(
  {
    document: 'spaces/{spaceId}/tasks/{taskId}',
    memory: '512MiB',
  },
  async event => {
    logger.info(`[Task:onCreate] eventId='${event.id}'`);
    logger.info(`[Task:onCreate] params='${JSON.stringify(event.params)}'`);
    logger.info(`[Task:onCreate] tmp-task-folder='${TMP_TASK_FOLDER}'`);
    const { spaceId, taskId } = event.params;
    // No Data
    if (!event.data) return;
    const task = event.data.data() as Task;
    logger.info(`[Task:onCreate] task='${JSON.stringify(task)}'`);
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
    logger.info(`[Task:onCreate] update='${JSON.stringify(updateToInProgress)}'`);
    await event.data.ref.update(updateToInProgress);
    // Run Task
    const updateToFinished: UpdateData<Task> = {
      status: TaskStatus.FINISHED,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (task.kind === TaskKind.ASSET_EXPORT) {
      const metadata = await assetsExport(spaceId, taskId, task);
      logger.info(`[Task:onCreate] metadata='${JSON.stringify(metadata)}'`);
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
        } else {
          updateToFinished.message = 'Asset data is invalid.';
          updateToFinished.trace = JSON.stringify(errors.format());
        }
      }
    } else if (task.kind === TaskKind.ASSET_REGEN_METADATA) {
      await assetRegenerateMetadata(spaceId);
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
        } else {
          updateToFinished.message = 'Content data is invalid.';
          updateToFinished.trace = JSON.stringify(errors.format());
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
        } else {
          updateToFinished.message = 'Schema data is invalid.';
          updateToFinished.trace = JSON.stringify(errors.format());
        }
      }
    } else if (task.kind === TaskKind.TRANSLATION_EXPORT) {
      if (task.locale) {
        const metadata = await translationsExportJsonFlat(spaceId, taskId, task);
        updateToFinished['file'] = {
          name: `translation-${task.locale}-export-${taskId}.json`,
          size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
        };
      } else {
        const metadata = await translationsExport(spaceId, taskId, task);
        updateToFinished['file'] = {
          name: `translation-export-${taskId}.llt.zip`,
          size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
        };
      }
    } else if (task.kind === TaskKind.TRANSLATION_IMPORT) {
      let errors: any;
      if (task.locale) {
        errors = await translationsImportJsonFlat(spaceId, taskId, task);
      } else {
        errors = await translationsImport(spaceId, taskId);
      }
      if (errors) {
        updateToFinished.status = TaskStatus.ERROR;
        if (errors === 'WRONG_METADATA') {
          updateToFinished.message = 'It is not a Translation Export file.';
        } else {
          updateToFinished.message = 'Translation data is invalid.';
          updateToFinished.trace = JSON.stringify(errors.format());
        }
      }
    }
    // Export Finished
    logger.info(`[Task:onCreate] update='${JSON.stringify(updateToFinished)}'`);
    await event.data.ref.update(updateToFinished);
  }
);

/**
 * assetExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function assetsExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportAssets: (AssetExport | undefined)[] = [];
  if (task.path) {
    // Only specific folder or asset
    const rootAssetSnapshot = await findAssetById(spaceId, task.path).get();
    if (rootAssetSnapshot.exists) {
      const rootAsset = rootAssetSnapshot.data() as Asset;
      exportAssets.push(docAssetToExport(rootAssetSnapshot.id, rootAsset));
      logger.info(`[Task:onCreate:assetsExport] root id=${rootAssetSnapshot.id} name=${rootAsset.name}`);
      // folder, all sub documents
      if (rootAsset.kind === AssetKind.FOLDER) {
        const startParentPath = rootAsset.parentPath === '' ? rootAssetSnapshot.id : `${rootAsset.parentPath}/${rootAssetSnapshot.id}`;
        const assetsSnapshot = await findAssetsByStartFullSlug(spaceId, startParentPath).get();
        assetsSnapshot.docs.forEach(doc => {
          const asset = doc.data() as Asset;
          exportAssets.push(docAssetToExport(doc.id, asset));
          logger.info(`[Task:onCreate:assetsExport] sub-folder id=${doc.id} name=${asset.name}`);
        });
      }
      // it is not located in root folder, requires to extract all folder till
      if (rootAsset.parentPath !== '') {
        const assetIds = rootAsset.parentPath.split('/');
        for (const assetId of assetIds) {
          const assetSnapshot = await findAssetById(spaceId, assetId).get();
          const asset = assetSnapshot.data() as Asset;
          logger.info(`[Task:onCreate:assetsExport] path id=${assetSnapshot.id} name=${asset.name}`);
          exportAssets.push(docAssetToExport(assetSnapshot.id, asset));
        }
      }
    } else {
      // path not exist
    }
  } else {
    // Export Everything
    const assetsSnapshot = await findAssets(spaceId).get();
    assetsSnapshot.docs
      .filter(it => it.exists)
      .forEach(doc => {
        const asset = doc.data() as Asset;
        exportAssets.push(docAssetToExport(doc.id, asset));
      });
  }
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const fileMetadata: TaskExportMetadata = {
    kind: 'ASSET',
  };
  if (task.path) {
    fileMetadata.path = task.path;
  }
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
    exportAssets
      .map(it => it!)
      .filter(it => it.kind === AssetKind.FILE)
      .map(asset =>
        bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`).download({ destination: `${assetsTmpFolder}/${asset.id}` })
      )
  );

  await zip.compressDir(tmpTaskFolder, assetsExportZipFile, { ignoreBase: true });

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(assetsExportZipFile));
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * assetImport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function assetsImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await zip.uncompress(zipPath, tmpTaskFolder);
  const assets = JSON.parse(readFileSync(`${tmpTaskFolder}/assets.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'ASSET') return 'WRONG_METADATA';
  const parse = zAssetExportArraySchema.safeParse(assets);
  if (!parse.success) {
    logger.warn(`[Task:onCreate:assetsImport] invalid=${JSON.stringify(parse.error)}`);
    return parse.error;
  }
  logger.info(`[Task:onCreate:assetsImport] valid=${assets.length}`);
  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
  const ids = new Map<string, string>();
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
        inProgress: true,
        extension: asset.extension,
        type: asset.type,
        size: asset.size,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      // Optional Fields
      if (asset.alt) add.alt = asset.alt;
      if (asset.metadata) add.metadata = asset.metadata;
      if (asset.source) add.source = asset.source;
      batch.set(assetRef, add);
      ids.set(asset.id, assetTmpPath);
    } else if (asset.kind === AssetKind.FOLDER) {
      const add: WithFieldValue<AssetFolder> = {
        kind: AssetKind.FOLDER,
        name: asset.name,
        parentPath: asset.parentPath,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.set(assetRef, add);
    }
    totalChanges++;
    count++;
    if (count === BATCH_MAX) {
      logger.info('[Task:onCreate:assetsImport] batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
      for (const [key, value] of ids) {
        logger.info(`[Task:onCreate:assetsImport] Save File ${key}`);
        await bucket.file(`spaces/${spaceId}/assets/${key}/original`).save(readFileSync(value));
      }
      // ids.forEach((value, key) => {
      //   logger.info(`[Task:onCreate] Save File ${key}`);
      //   bucket.file(`spaces/${spaceId}/assets/${key}/original`).save(readFileSync(value));
      // });
      ids.clear();
    }
  }
  logger.info('[Task:onCreate:assetsImport] end remaining: ' + count);
  if (count > 0) {
    logger.info('[Task:onCreate:assetsImport] batch.commit() : ' + totalChanges);
    await batch.commit();
    for (const [key, value] of ids) {
      logger.info(`[Task:onCreate:assetsImport] Save File ${key}`);
      await bucket.file(`spaces/${spaceId}/assets/${key}/original`).save(readFileSync(value));
    }
    // ids.forEach((value, key) => {
    //   logger.info(`[Task:onCreate] Save File ${key}`);
    //   await bucket.file(`spaces/${spaceId}/assets/${key}/original`).save(readFileSync(value));
    // });
    ids.clear();
  }
  logger.info('[Task:onCreate:assetsImport] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * Asset Regenerate Metadata Job
 * @param {string} spaceId original task
 */
async function assetRegenerateMetadata(spaceId: string): Promise<void> {
  const assetsSnapshot = await findAssets(spaceId, AssetKind.FILE).get();
  for (const assetSnapshot of assetsSnapshot.docs) {
    logger.info('[Task:onCreate:assetsRegenMetadata] asset : ' + assetSnapshot.ref.path);
    await updateMetadataByRef(assetSnapshot.ref);
  }
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function contentsExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportContents: (ContentExport | undefined)[] = [];
  if (task.path) {
    // Only specific folder or document
    const rootContentSnapshot = await findContentById(spaceId, task.path).get();
    if (rootContentSnapshot.exists) {
      const rootContent = rootContentSnapshot.data() as Content;
      exportContents.push(docContentToExport(rootContentSnapshot.id, rootContent));
      logger.info(`[Task:onCreate:contentsExport] root fullSlug=${rootContent.fullSlug}`);
      // folder, all sub documents
      if (rootContent.kind === ContentKind.FOLDER) {
        const contentsSnapshot = await findContentsByStartFullSlug(spaceId, `${rootContent.fullSlug}/`).get();
        contentsSnapshot.docs.forEach(doc => {
          const content = doc.data() as Content;
          exportContents.push(docContentToExport(doc.id, content));
          logger.info(`[Task:onCreate:contentsExport] sub-folder fullSlug=${content.fullSlug}`);
        });
      }
      // it is not located in root folder, requires to extract all folder till
      if (rootContent.parentSlug !== '') {
        // iterate over all sub-folders
        const slugs = rootContent.parentSlug.split('/');
        let navigationSlug = '';
        for (const slug of slugs) {
          if (navigationSlug === '') {
            // root
            // find by parentSlug = navigationSlug
            navigationSlug = slug;
          } else {
            // not root
            // find by parentSlug = navigationSlug
            navigationSlug = `${navigationSlug}/${slug}`;
          }
          const contentsSnapshot = await findContentByFullSlug(spaceId, navigationSlug).get();
          contentsSnapshot.docs.forEach(doc => {
            const content = doc.data() as Content;
            logger.info(`[Task:onCreate:contentsExport] path fullSlug=${content.fullSlug}`);
            exportContents.push(docContentToExport(doc.id, content));
          });
        }
      }
    } else {
      // path not exist
    }
  } else {
    // Export Everything
    const contentsSnapshot = await findContents(spaceId).get();
    contentsSnapshot.docs
      .filter(it => it.exists)
      .forEach(doc => {
        const content = doc.data() as Content;
        exportContents.push(docContentToExport(doc.id, content));
      });
  }
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const fileMetadata: TaskExportMetadata = {
    kind: 'CONTENT',
  };
  if (task.path) {
    fileMetadata.path = task.path;
  }
  // Create TMP Folder
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/contents.json`, JSON.stringify(exportContents));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  // Create assets folder
  const contentsExportZipFile = `${tmpdir()}/contents-${taskId}.zip`;

  await zip.compressDir(tmpTaskFolder, contentsExportZipFile, { ignoreBase: true });

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(contentsExportZipFile));
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function contentsImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await zip.uncompress(zipPath, tmpTaskFolder);
  const contents = JSON.parse(readFileSync(`${tmpTaskFolder}/contents.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'CONTENT') return 'WRONG_METADATA';
  const parse = zContentExportArraySchema.safeParse(contents);
  if (!parse.success) {
    logger.warn(`[Task:onCreate:contentsImport] invalid=${JSON.stringify(parse.error)}`);
    return parse.error;
  }
  logger.info(`[Task:onCreate] valid=${contents.length}`);
  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
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
        batch.update(contentRef, update);
      } else if (content.kind === ContentKind.FOLDER) {
        const update: UpdateData<ContentFolder> = {
          kind: ContentKind.FOLDER,
          name: content.name,
          slug: content.slug,
          parentSlug: content.parentSlug,
          fullSlug: content.fullSlug,
          updatedAt: FieldValue.serverTimestamp(),
        };
        batch.update(contentRef, update);
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
        batch.set(contentRef, add);
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
        batch.set(contentRef, add);
      }
    }
    totalChanges++;
    count++;
    if (count === BATCH_MAX) {
      logger.info('[Task:onCreate] batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  logger.info('[Task:onCreate] end remaining: ' + count);
  if (count > 0) {
    logger.info('[Task:onCreate] batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  logger.info('[Task:onCreate] bulk total changes : ' + totalChanges);
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
  schemasSnapshot.docs
    .filter(it => it.exists)
    .forEach(doc => {
      const schema = doc.data() as Schema;
      if (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE) {
        exportSchemas.push({
          id: doc.id,
          type: schema.type,
          displayName: schema.displayName,
          description: schema.description,
          previewField: schema.previewField,
          labels: schema.labels,
          fields: schema.fields,
        });
      } else if (schema.type === SchemaType.ENUM) {
        exportSchemas.push({
          id: doc.id,
          type: schema.type,
          displayName: schema.displayName,
          description: schema.description,
          labels: schema.labels,
          values: schema.values,
        });
      }
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

  await zip.compressDir(tmpTaskFolder, schemasExportZipFile, { ignoreBase: true });

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(schemasExportZipFile));
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function schemasImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  logger.info('[Task:onCreate:schemasImport] Started');
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await zip.uncompress(zipPath, tmpTaskFolder);
  const schemas = JSON.parse(readFileSync(`${tmpTaskFolder}/schemas.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'SCHEMA') return 'WRONG_METADATA';
  const parse = zSchemaExportArraySchema.safeParse(schemas);
  if (!parse.success) {
    logger.warn(`[Task:onCreate:schemasImport] invalid=${JSON.stringify(parse.error)}`);
    return parse.error;
  }
  logger.info(`[Task:onCreate:schemasImport] valid=${schemas.length}`);
  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
  for (const schema of schemas as SchemaExport[]) {
    const schemaRef = findSchemaById(spaceId, schema.id);
    const schemaSnapshot = await schemaRef.get();
    if (schemaSnapshot.exists) {
      if (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE) {
        const update: UpdateData<SchemaComponent> = {
          type: schema.type,
          displayName: schema.displayName || FieldValue.delete(),
          description: schema.description || FieldValue.delete(),
          previewField: schema.previewField || FieldValue.delete(),
          labels: schema.labels || FieldValue.delete(),
          fields: schema.fields || FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        batch.update(schemaRef, update);
      } else if (schema.type === SchemaType.ENUM) {
        const update: UpdateData<SchemaEnum> = {
          type: schema.type,
          displayName: schema.displayName || FieldValue.delete(),
          description: schema.description || FieldValue.delete(),
          labels: schema.labels || FieldValue.delete(),
          values: schema.values || FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        batch.update(schemaRef, update);
      }
    } else {
      if (schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE) {
        const add: WithFieldValue<SchemaComponent> = {
          type: schema.type,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (schema.displayName) add.displayName = schema.displayName;
        if (schema.description) add.description = schema.description;
        if (schema.previewField) add.previewField = schema.previewField;
        if (schema.labels) add.labels = schema.labels;
        if (schema.fields) add.fields = schema.fields;
        batch.set(schemaRef, add);
      } else if (schema.type === SchemaType.ENUM) {
        const add: WithFieldValue<SchemaEnum> = {
          type: schema.type,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (schema.displayName) add.displayName = schema.displayName;
        if (schema.description) add.description = schema.description;
        if (schema.labels) add.labels = schema.labels;
        if (schema.values) add.values = schema.values;
        batch.set(schemaRef, add);
      }
    }
    totalChanges++;
    count++;
    if (count === BATCH_MAX) {
      logger.info('[Task:onCreate:schemasImport] batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  logger.info('[Task:onCreate:schemasImport] end remaining: ' + count);
  if (count > 0) {
    logger.info('[Task:onCreate:schemasImport] batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  logger.info('[Task:onCreate:schemasImport] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * translationsExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsExport(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportTranslations: TranslationExport[] = [];
  const translationsSnapshot = await findTranslations(spaceId, task.fromDate).get();
  translationsSnapshot.docs
    .filter(it => it.exists)
    .forEach(doc => {
      const translation = doc.data() as Translation;
      const exportedTr: TranslationExport = {
        id: doc.id,
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

  await zip.compressDir(tmpTaskFolder, translationsExportZipFile, { ignoreBase: true });

  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(translationsExportZipFile));
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * translationsExportJsonFlat Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsExportJsonFlat(spaceId: string, taskId: string, task: Task): Promise<any> {
  const exportTranslations: Record<string, string> = {};
  const translationsSnapshot = await findTranslations(spaceId, task.fromDate).get();
  translationsSnapshot.docs
    .filter(it => it.exists)
    .forEach(doc => {
      const translation = doc.data() as Translation;
      if (task.locale) {
        const locale = translation.locales[task.locale];
        if (locale) {
          exportTranslations[doc.id] = locale;
        }
      }
    });
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(JSON.stringify(exportTranslations));
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  return metadata;
}

/**
 * translations Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function translationsImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await zip.uncompress(zipPath, tmpTaskFolder);
  const translations = JSON.parse(readFileSync(`${tmpTaskFolder}/translations.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'TRANSLATION') return 'WRONG_METADATA';
  const parse = zTranslationExportArraySchema.safeParse(translations);
  if (!parse.success) {
    logger.warn(`[Task:onCreate:translationsImport] invalid=${JSON.stringify(parse.error)}`);
    return parse.error;
  }
  logger.info(`[Task:onCreate:translationsImport] valid=${translations.length}`);
  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
  for (const translation of translations as TranslationExport[]) {
    const translationRef = findTranslationById(spaceId, translation.id);
    const translationSnapshot = await translationRef.get();
    if (translationSnapshot.exists) {
      const update: UpdateData<Translation> = {
        type: translation.type,
        locales: translation.locales,
        description: translation.description || FieldValue.delete(),
        labels: translation.labels || FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.update(translationRef, update);
    } else {
      const add: WithFieldValue<Translation> = {
        type: translation.type,
        locales: translation.locales,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (translation.description) add.description = translation.description;
      if (translation.labels) add.labels = translation.labels;
      batch.set(translationRef, add);
    }
    totalChanges++;
    count++;
    if (count === BATCH_MAX) {
      logger.info('[Task:onCreate:translationsImport] batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  logger.info('[Task:onCreate:translationsImport] end remaining: ' + count);
  if (count > 0) {
    logger.info('[Task:onCreate:translationsImport] batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  logger.info('[Task:onCreate:translationsImport] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * translations Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsImportJsonFlat(spaceId: string, taskId: string, task: Task): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  mkdirSync(tmpTaskFolder);
  const jsonPath = `${tmpTaskFolder}/task.json`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: jsonPath });
  const translations: Record<string, string> = JSON.parse(readFileSync(jsonPath).toString());
  if (task.locale === undefined) return 'WRONG_METADATA';
  const parse = zTranslationFlatExportSchema.safeParse(translations);
  if (!parse.success) {
    logger.warn(`[Task:onCreate:translationsImportJsonFlat] invalid=${JSON.stringify(parse.error)}`);
    return parse.error;
  }
  logger.info(`[Task:onCreate] valid=${Object.getOwnPropertyNames(translations).length}`);
  const origTransMap = new Map<string, Translation>();
  const translationsSnapshot = await findTranslations(spaceId).get();
  translationsSnapshot.docs
    .filter(it => it.exists)
    .forEach(it => {
      const tr = it.data() as Translation;
      origTransMap.set(it.id, tr);
    });
  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
  for (const id of Object.getOwnPropertyNames(translations)) {
    const ot = origTransMap.get(id);
    if (ot) {
      // update
      if (ot.locales[task.locale] !== translations[id]) {
        const update: UpdateData<Translation> = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        update[`locales.${task.locale}`] = translations[id];
        batch.update(findTranslationById(spaceId, id), update);
        totalChanges++;
      }
    } else {
      const add: any = {
        type: TranslationType.STRING,
        locales: {},
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      add.locales[task.locale] = translations[id];
      batch.set(firestoreService.doc(`spaces/${spaceId}/translations/${id}`), add);
      totalChanges++;
    }
    count++;
    if (count === BATCH_MAX) {
      logger.info('[Task:onCreate] batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  logger.info('[Task:onCreate] end remaining: ' + count);
  if (count > 0) {
    logger.info('[Task:onCreate] batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  logger.info('[Task:onCreate] batch total changes : ' + totalChanges);
  return undefined;
}

const onTaskDeleted = onDocumentDeleted('spaces/{spaceId}/tasks/{taskId}', async event => {
  logger.info(`[Task:onDeleted] eventId='${event.id}'`);
  logger.info(`[Task:onDeleted] params='${JSON.stringify(event.params)}'`);
  const { spaceId, taskId } = event.params;
  return bucket.deleteFiles({
    prefix: `spaces/${spaceId}/tasks/${taskId}`,
  });
});

export const task = {
  oncreate: onTaskCreate,
  ondelete: onTaskDeleted,
};
