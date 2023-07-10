import {logger} from 'firebase-functions/v2';
import {onDocumentCreated, onDocumentDeleted} from 'firebase-functions/v2/firestore';
import {Task, TaskExportMetadata, TaskKind, TaskStatus} from './models/task.model';
import {FieldValue, UpdateData} from 'firebase-admin/firestore';
import {bucket} from './config';
import {Asset, AssetExport, AssetFile, AssetFolder, AssetKind} from './models/asset.model';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import {zip} from 'compressing';
import {ErrorObject} from 'ajv';
import {findAssetById, findAssets, validateAssetImport} from './services/asset.service';
import {Content, ContentDocument, ContentExport, ContentFolder, ContentKind} from './models/content.model';
import {findContentById, findContents, validateContentImport} from './services/content.service';
import {tmpdir} from 'os';

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
    const metadata = await assetExport(spaceId, taskId, task);
    logger.info(`[Task::onTaskCreate] metadata='${JSON.stringify(metadata)}'`);
    updateToFinished['file'] = {
      name: `asset-export-${taskId}.lla.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.ASSET_IMPORT) {
    const errors = await assetImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Asset Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Asset data is invalid.';
      }
    }
  } else if (task.kind === TaskKind.CONTENT_EXPORT) {
    const metadata = await contentExport(spaceId, taskId, task);
    updateToFinished['file'] = {
      name: `content-export-${taskId}.llc.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.CONTENT_IMPORT) {
    const errors = await contentImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Content Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Content data is invalid.';
      }
    }
  } else if (task.kind === TaskKind.SCHEMA_EXPORT) {
    const metadata = await schemaExport(spaceId, taskId);
    updateToFinished['file'] = {
      name: `schema-export-${taskId}.lls.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.SCHEMA_IMPORT) {
    const errors = await schemaImport(spaceId, taskId);
    if (errors) {
      updateToFinished.status = TaskStatus.ERROR;
      if (errors === 'WRONG_METADATA') {
        updateToFinished.message = 'It is not a Schema Export file.';
      } else if (Array.isArray(errors)) {
        updateToFinished.message = 'Schema data is invalid.';
      }
    }
  } else if (task.kind === TaskKind.TRANSLATION_EXPORT) {
    const metadata = await translationExport(spaceId, taskId);
    updateToFinished['file'] = {
      name: `translation-export-${taskId}.llt.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.TRANSLATION_IMPORT) {
    const errors = await translationImport(spaceId, taskId);
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
async function assetExport(spaceId: string, taskId: string, task: Task): Promise<any> {
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
        } as AssetFolder);
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
        } as AssetFile);
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
async function assetImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
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
  } else {
    logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(assets)}`);
    for (const asset of assets as AssetExport[]) {
      const assetRef = findAssetById(spaceId, asset.id);
      const assetSnapshot = await assetRef.get();
      if (asset.kind === AssetKind.FILE && existsSync(`${tmpTaskFolder}/assets/${asset.id}`) && !assetSnapshot.exists) {
        await assetRef.set({
          uploaded: false,
          ...asset,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        await bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`).save(readFileSync(`${tmpTaskFolder}/assets/${asset.id}`));
      } else if (asset.kind === AssetKind.FOLDER && !assetSnapshot.exists) {
        await assetRef.set({
          ...asset,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    return undefined;
  }
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function contentExport(spaceId: string, taskId: string, task: Task): Promise<any> {
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
        } as ContentFolder);
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
        } as ContentDocument);
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
async function contentImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
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
  } else {
    logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(contents)}`);
    for (const content of contents as ContentExport[]) {
      const contentRef = findContentById(spaceId, content.id);
      const contentSnapshot = await contentRef.get();
      if (contentSnapshot.exists) {
        await contentRef.set({
          ...content,
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});
      } else {
        await contentRef.set({
          ...content,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    return undefined;
  }
}

async function schemaExport(spaceId: string, taskId: string): Promise<any> {

}

async function schemaImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
  return undefined;
}

async function translationExport(spaceId: string, taskId: string): Promise<any> {

}

async function translationImport(spaceId: string, taskId: string): Promise<ErrorObject[] | undefined | 'WRONG_METADATA'> {
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
