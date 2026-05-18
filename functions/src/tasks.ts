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
  isTaskAssetExport,
  isTaskAssetImport,
  isTaskAssetRegenMetadata,
  isTaskContentExport,
  isTaskContentImport,
  isTaskSchemaExport,
  isTaskSchemaImport,
  isTaskTranslationExport,
  isTaskTranslationImport,
  Schema,
  SchemaComponent,
  SchemaEnum,
  SchemaExport,
  SchemaType,
  Space,
  Task,
  TaskAssetExport,
  TaskContentExport,
  TaskExportMetadata,
  TaskImport,
  TaskKind,
  TaskSchemaExport,
  TaskStatus,
  TaskTranslationExport,
  TaskTranslationImport,
  Translation,
  TranslationExport,
  TranslationType,
  zAssetExportArraySchema,
  zContentExportArraySchema,
  zSchemaExportArraySchema,
  zTranslationExportArraySchema,
  zTranslationFlatExportSchema,
} from './models';
import { bucket, firestoreService } from './config';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
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
  findSpaceById,
  findTranslationById,
  findTranslations,
  generateTranslationsDraft,
  isAssetChanged,
  isContentChanged,
  isSchemaChanged,
  isTranslationChanged,
  updateMetadataByRef,
} from './services';
import { tmpdir } from 'os';
import { ZodError } from 'zod';

const TMP_TASK_FOLDER = `${tmpdir()}/task-`;

/**
 * Stream a local file to GCS without loading it entirely into memory.
 * @param {string} localPath - path to local file
 * @param {string} gcsDestination - destination path in GCS
 * @return {Promise<void>}
 */
function streamFileToStorage(localPath: string, gcsDestination: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    createReadStream(localPath)
      .pipe(bucket.file(gcsDestination).createWriteStream({ resumable: false }))
      .on('finish', resolve)
      .on('error', reject);
  });
}

// Firestore events
const onTaskCreate = onDocumentCreated(
  {
    document: 'spaces/{spaceId}/tasks/{taskId}',
    memory: '4GiB',
    timeoutSeconds: 3600,
  },
  async event => {
    const { spaceId, taskId } = event.params;
    logger.info(`[Task:onCreate] eventId='${event.id}'`);
    logger.info(`[Task:onCreate] params='${JSON.stringify(event.params)}'`);
    logger.info(`[Task:onCreate] tmp-task-folder='${TMP_TASK_FOLDER}-${taskId}'`);
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
    if (
      task.kind === TaskKind.ASSET_IMPORT ||
      task.kind === TaskKind.CONTENT_IMPORT ||
      task.kind === TaskKind.SCHEMA_IMPORT ||
      task.kind === TaskKind.TRANSLATION_IMPORT
    ) {
      const newPath = `spaces/${spaceId}/tasks/${taskId}/original`;
      await bucket.file(task.tmpPath).move(newPath);
      (updateToInProgress as UpdateData<TaskImport>).tmpPath = FieldValue.delete();
    }
    // Update to IN_PROGRESS
    logger.info(`[Task:onCreate] update='${JSON.stringify(updateToInProgress)}'`);
    await event.data.ref.update(updateToInProgress);
    // Run Task
    const updateToFinished: UpdateData<Task> = {
      status: TaskStatus.FINISHED,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (isTaskAssetExport(task)) {
      const metadata = await assetsExport(spaceId, taskId, task);
      logger.info(`[Task:onCreate] metadata='${JSON.stringify(metadata)}'`);

      (updateToFinished as UpdateData<TaskAssetExport>).file = {
        name: `asset-export-${taskId}.lla.zip`,
        size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
      };
    } else if (isTaskAssetImport(task)) {
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
    } else if (isTaskAssetRegenMetadata(task)) {
      await assetRegenerateMetadata(spaceId);
    } else if (isTaskContentExport(task)) {
      const metadata = await contentsExport(spaceId, taskId, task);
      (updateToFinished as UpdateData<TaskContentExport>).file = {
        name: `content-export-${taskId}.llc.zip`,
        size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
      };
    } else if (isTaskContentImport(task)) {
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
    } else if (isTaskSchemaExport(task)) {
      const metadata = await schemasExport(spaceId, taskId, task);
      (updateToFinished as UpdateData<TaskSchemaExport>).file = {
        name: `schema-export-${taskId}.lls.zip`,
        size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
      };
    } else if (isTaskSchemaImport(task)) {
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
    } else if (isTaskTranslationExport(task)) {
      if (task.locale) {
        const metadata = await translationsExportJsonFlat(spaceId, taskId, task);
        (updateToFinished as UpdateData<TaskTranslationExport>).file = {
          name: `translation-${task.locale}-export-${taskId}.json`,
          size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
        };
      } else {
        const metadata = await translationsExport(spaceId, taskId, task);
        (updateToFinished as UpdateData<TaskTranslationExport>).file = {
          name: `translation-export-${taskId}.llt.zip`,
          size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
        };
      }
    } else if (isTaskTranslationImport(task)) {
      let errors: ZodError | 'WRONG_METADATA' | undefined;
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
async function assetsExport(spaceId: string, taskId: string, task: TaskAssetExport): Promise<any> {
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

  logger.info('[Task:onCreate:assetsExport] downloading files');
  for (const asset of exportAssets) {
    if (asset && asset.kind === AssetKind.FILE) {
      await bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`).download({ destination: `${assetsTmpFolder}/${asset.id}` });
    }
  }
  logger.info('[Task:onCreate:assetsExport] all files downloaded');
  logger.info('[Task:onCreate:assetsExport] zip started');
  await zip.compressDir(tmpTaskFolder, assetsExportZipFile, { ignoreBase: true });
  logger.info('[Task:onCreate:assetsExport] zip completed');
  logger.info('[Task:onCreate:assetsExport] zip uploading');
  await bucket.upload(assetsExportZipFile, {
    destination: `spaces/${spaceId}/tasks/${taskId}/original`,
    resumable: false,
    chunkSize: 5 * 1024 * 1024,
  });
  logger.info('[Task:onCreate:assetsExport] zip uploaded');
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  logger.info('[Task:onCreate:assetsExport] save metadata');
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

  // Load all existing assets into a map to avoid per-document reads
  const origAssetMap = new Map<string, Asset>();
  const assetsSnapshot = await findAssets(spaceId).get();
  assetsSnapshot.docs
    .filter(it => it.exists)
    .forEach(it => origAssetMap.set(it.id, it.data() as Asset));

  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  const ids = new Map<string, string>();
  for (const asset of assets as AssetExport[]) {
    const assetRef = findAssetById(spaceId, asset.id);
    const existing = origAssetMap.get(asset.id);
    if (existing) {
      if (isAssetChanged(existing, asset)) {
        if (asset.kind === AssetKind.FILE) {
          const update: UpdateData<AssetFile> = {
            name: asset.name,
            parentPath: asset.parentPath,
            extension: asset.extension,
            type: asset.type,
            size: asset.size,
            alt: asset.alt || FieldValue.delete(),
            source: asset.source || FieldValue.delete(),
            metadata: asset.metadata || FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          bulk.update(assetRef, update);
        } else if (asset.kind === AssetKind.FOLDER) {
          const update: UpdateData<AssetFolder> = {
            name: asset.name,
            parentPath: asset.parentPath,
            updatedAt: FieldValue.serverTimestamp(),
          };
          bulk.update(assetRef, update);
        }
        totalChanges++;
      }
    } else {
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
        bulk.set(assetRef, add);
        ids.set(asset.id, assetTmpPath);
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
  }
  logger.info('[Task:onCreate:assetsImport] bulk.close() : ' + totalChanges);
  await bulk.close();
  for (const [key, value] of ids) {
    logger.info(`[Task:onCreate:assetsImport] Save File ${key}`);
    await streamFileToStorage(value, `spaces/${spaceId}/assets/${key}/original`);
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
async function contentsExport(spaceId: string, taskId: string, task: TaskContentExport): Promise<any> {
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
  logger.info(`[Task:onCreate:contentsImport] valid=${contents.length}`);

  // Load all existing contents into a map to avoid per-document reads
  const origContentMap = new Map<string, Content>();
  const contentsSnapshot = await findContents(spaceId).get();
  contentsSnapshot.docs
    .filter(it => it.exists)
    .forEach(it => origContentMap.set(it.id, it.data() as Content));

  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const content of contents as ContentExport[]) {
    const contentRef = findContentById(spaceId, content.id);
    const existing = origContentMap.get(content.id);
    if (existing) {
      if (isContentChanged(existing, content)) {
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
        totalChanges++;
      }
    } else {
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
      totalChanges++;
    }
  }
  logger.info('[Task:onCreate:contentsImport] bulk.close() : ' + totalChanges);
  await bulk.close();
  logger.info('[Task:onCreate:contentsImport] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function schemasExport(spaceId: string, taskId: string, task: TaskSchemaExport): Promise<any> {
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

  // Load all existing schemas into a map to avoid per-document reads
  const origSchemaMap = new Map<string, Schema>();
  const schemasSnapshot = await findSchemas(spaceId).get();
  schemasSnapshot.docs
    .filter(it => it.exists)
    .forEach(it => origSchemaMap.set(it.id, it.data() as Schema));

  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const schema of schemas as SchemaExport[]) {
    const schemaRef = findSchemaById(spaceId, schema.id);
    const existing = origSchemaMap.get(schema.id);
    if (existing) {
      if (isSchemaChanged(existing, schema)) {
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
          bulk.update(schemaRef, update);
        } else if (schema.type === SchemaType.ENUM) {
          const update: UpdateData<SchemaEnum> = {
            type: schema.type,
            displayName: schema.displayName || FieldValue.delete(),
            description: schema.description || FieldValue.delete(),
            labels: schema.labels || FieldValue.delete(),
            values: schema.values || FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          bulk.update(schemaRef, update);
        }
        totalChanges++;
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
        bulk.set(schemaRef, add);
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
        bulk.set(schemaRef, add);
      }
      totalChanges++;
    }
  }
  logger.info('[Task:onCreate:schemasImport] bulk.close() : ' + totalChanges);
  await bulk.close();
  logger.info('[Task:onCreate:schemasImport] bulk total changes : ' + totalChanges);
  return undefined;
}

/**
 * translationsExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsExport(spaceId: string, taskId: string, task: TaskTranslationExport): Promise<any> {
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
async function translationsExportJsonFlat(spaceId: string, taskId: string, task: TaskTranslationExport): Promise<any> {
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

  // Load all existing translations into a map to avoid per-document reads
  const origTransMap = new Map<string, Translation>();
  const translationsSnapshot = await findTranslations(spaceId).get();
  translationsSnapshot.docs
    .filter(it => it.exists)
    .forEach(it => origTransMap.set(it.id, it.data() as Translation));

  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const translation of translations as TranslationExport[]) {
    const translationRef = findTranslationById(spaceId, translation.id);
    const existing = origTransMap.get(translation.id);
    if (existing) {
      if (isTranslationChanged(existing, translation)) {
        const update: UpdateData<Translation> = {
          type: translation.type,
          locales: translation.locales,
          description: translation.description || FieldValue.delete(),
          labels: translation.labels || FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        bulk.update(translationRef, update);
        totalChanges++;
      }
    } else {
      const add: WithFieldValue<Translation> = {
        type: translation.type,
        locales: translation.locales,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (translation.description) add.description = translation.description;
      if (translation.labels) add.labels = translation.labels;
      bulk.set(translationRef, add);
      totalChanges++;
    }
  }
  logger.info('[Task:onCreate:translationsImport] bulk.close() : ' + totalChanges);
  await bulk.close();
  logger.info('[Task:onCreate:translationsImport] bulk total changes : ' + totalChanges);
  // Generate draft files once after all translations are imported
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (spaceSnapshot.exists) {
    logger.info('[Task:onCreate:translationsImport] Generating draft files');
    await generateTranslationsDraft(spaceId, spaceSnapshot.data() as Space);
  }
  return undefined;
}

/**
 * translations Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsImportJsonFlat(
  spaceId: string,
  taskId: string,
  task: TaskTranslationImport
): Promise<ZodError | undefined | 'WRONG_METADATA'> {
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
  logger.info(`[Task:onCreate:translationsImportJsonFlat] valid=${Object.getOwnPropertyNames(translations).length}`);
  const origTransMap = new Map<string, Translation>();
  const translationsSnapshot = await findTranslations(spaceId).get();
  translationsSnapshot.docs
    .filter(it => it.exists)
    .forEach(it => {
      const tr = it.data() as Translation;
      origTransMap.set(it.id, tr);
    });
  let totalChanges = 0;
  const bulk = firestoreService.bulkWriter();
  for (const id of Object.getOwnPropertyNames(translations)) {
    const ot = origTransMap.get(id);
    if (ot) {
      // update
      if (ot.locales[task.locale] !== translations[id]) {
        const update: UpdateData<Translation> = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        update[`locales.${task.locale}`] = translations[id];
        bulk.update(findTranslationById(spaceId, id), update);
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
      bulk.set(firestoreService.doc(`spaces/${spaceId}/translations/${id}`), add);
      totalChanges++;
    }
  }
  logger.info('[Task:onCreate:translationsImportJsonFlat] bulk.close() : ' + totalChanges);
  await bulk.close();
  logger.info('[Task:onCreate:translationsImportJsonFlat] bulk total changes : ' + totalChanges);
  // Generate draft files once after all translations are imported
  const spaceSnapshot = await findSpaceById(spaceId).get();
  if (spaceSnapshot.exists) {
    logger.info('[Task:onCreate:translationsImportJsonFlat] Generating draft files');
    await generateTranslationsDraft(spaceId, spaceSnapshot.data() as Space);
  }
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
