import {logger} from 'firebase-functions/v2';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {Task, TaskKind, TaskStatus} from './models/task.model';
import {FieldValue, UpdateData} from 'firebase-admin/firestore';
import {bucket, firestoreService} from './config';
import {Asset, AssetExportImport, AssetFile, AssetFolder, AssetKind} from './models/asset.model';
import * as os from 'os';
import * as fs from 'fs';
import {zip} from 'compressing';

const TMP_EXPORT_FOLDER = `${os.tmpdir()}/export`;

// Firestore events
export const onTaskCreate = onDocumentCreated('spaces/{spaceId}/tasks/{taskId}', async (event) => {
  logger.info(`[Task::onTaskCreate] eventId='${event.id}'`);
  logger.info(`[Task::onTaskCreate] params='${JSON.stringify(event.params)}'`);
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
    if (task.file) {
      const newPath = `spaces/${spaceId}/tasks/${taskId}/original`;
      await bucket.file(task.file.path).move(newPath);
      updateToInProgress['file.path'] = newPath;
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
      name: 'some name',
      size: metadata.size,
      type: 'zip',
      path: 'some path',
    };
  } else if (task.kind === TaskKind.ASSET_IMPORT) {
    assetImport(task);
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
  const tasksSnapshot = await firestoreService.collection(`spaces/${spaceId}/assets`).get();
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
  const tmpExportFolder = TMP_EXPORT_FOLDER + taskId;
  // Create TMP Folder
  fs.mkdirSync(tmpExportFolder);
  // Create assets.json
  fs.writeFileSync(`${tmpExportFolder}/assets.json`, JSON.stringify(exportAssets));

  // Create assets folder
  const assetsTmpFolder = `${tmpExportFolder}/assets`;
  const assetsExportZipFile = `${os.tmpdir()}/assets-${taskId}.zip`;
  fs.mkdirSync(assetsTmpFolder);

  await Promise.all(
    exportAssets.filter((it) => it.kind === AssetKind.FILE)
      .map((asset) =>
        bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`)
          .download({destination: `${assetsTmpFolder}/${asset.id}`})
      )
  );

  await zip.compressDir(assetsTmpFolder, assetsExportZipFile);

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

function assetImport(task: Task) {

}

function contentExport() {

}

function contentImport() {

}
