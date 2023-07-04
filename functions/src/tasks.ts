import {logger} from 'firebase-functions/v2';
import {onDocumentCreated, onDocumentDeleted} from 'firebase-functions/v2/firestore';
import {Task, TaskKind, TaskStatus} from './models/task.model';
import {FieldValue, UpdateData} from 'firebase-admin/firestore';
import {bucket} from './config';
import {Asset, AssetExportImport, assetExportImportArraySchema, AssetFile, AssetFolder, AssetKind} from './models/asset.model';
import * as os from 'os';
import * as fs from 'fs';
import {readFileSync} from 'fs';
import {zip} from 'compressing';
import Ajv from 'ajv';
import {findAssets} from './services/asset.service';

const TMP_TASK_FOLDER = `${os.tmpdir()}/task`;

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
  if (task.kind === TaskKind.CONTENT_IMPORT || task.kind === TaskKind.ASSET_IMPORT) {
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
    const metadata = await assetExport(spaceId, taskId);
    logger.info(`[Task::onTaskCreate] metadata='${JSON.stringify(metadata)}'`);
    updateToFinished['file'] = {
      name: `asset-export-${taskId}.lla.zip`,
      size: Number.isInteger(metadata.size) ? 0 : Number.parseInt(metadata.size),
    };
  } else if (task.kind === TaskKind.ASSET_IMPORT) {
    await assetImport(spaceId, taskId, task);
  } else if (task.kind === TaskKind.CONTENT_EXPORT) {
    contentExport();
  } else if (task.kind === TaskKind.CONTENT_IMPORT) {
    contentImport();
  }
  // Export Finished
  logger.info(`[Task::onTaskCreate] update='${JSON.stringify(updateToFinished)}'`);
  await event.data.ref.update(updateToFinished);
});

/**
 * assetExport Job
 * @param {string} spaceId original task
 * @param {Task} taskId original task
 */
async function assetExport(spaceId: string, taskId: string): Promise<any> {
  const exportAssets: AssetExportImport[] = [];
  const tasksSnapshot = await findAssets(spaceId).get();
  tasksSnapshot.docs.filter((it) => it.exists)
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
  // Create TMP Folder
  fs.mkdirSync(tmpTaskFolder);
  // Create assets.json
  fs.writeFileSync(`${tmpTaskFolder}/assets.json`, JSON.stringify(exportAssets));

  // Create assets folder
  const assetsTmpFolder = `${tmpTaskFolder}/assets`;
  const assetsExportZipFile = `${os.tmpdir()}/assets-${taskId}.zip`;
  fs.mkdirSync(assetsTmpFolder);

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
      fs.readFileSync(assetsExportZipFile),
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
 * @param {Task} task original task
 */
async function assetImport(spaceId: string, taskId: string, task: Task): Promise<any> {
  // let importAssets: AssetExportImport[] = [];
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  fs.mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({destination: zipPath});
  await zip.uncompress(zipPath, tmpTaskFolder);
  const assets = JSON.parse(readFileSync(`${tmpTaskFolder}/assets.json`).toString());
  const ajv = new Ajv({discriminator: true});
  const validate = ajv.compile(assetExportImportArraySchema);

  if (Array.isArray(assets) && validate(assets)) {
    logger.info(`[Task::onTaskCreate] valid=${JSON.stringify(assets)}`);
    // for (const asset of assets) {
    //   const assetRef = findAssetById(spaceId, asset.id);
    //   const assetSnapshot = await assetRef.get();
    //   if (!assetSnapshot.exists && existsSync(`${tmpTaskFolder}/assets/${asset.id}`)) {
    //     await assetRef.set({
    //       ...asset,
    //       createdAt: FieldValue.serverTimestamp(),
    //       updatedAt: FieldValue.serverTimestamp(),
    //     });
    //     await bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`).save(readFileSync(`${tmpTaskFolder}/assets/${asset.id}`));
    //   }
    // }
    // importAssets = assets;
  } else {
    logger.info(`[Task::onTaskCreate] invalid=${JSON.stringify(validate.errors)}`);
    return undefined;
  }
}

function contentExport() {

}

function contentImport() {

}


export const onTaskDeleted = onDocumentDeleted('spaces/{spaceId}/tasks/{taskId}', async (event) => {
  logger.info(`[Task::onTaskDeleted] eventId='${event.id}'`);
  logger.info(`[Task::onTaskDeleted] params='${JSON.stringify(event.params)}'`);
  const {spaceId, taskId} = event.params;
  return bucket.deleteFiles({
    prefix: `spaces/${spaceId}/tasks/${taskId}`,
  });
});
