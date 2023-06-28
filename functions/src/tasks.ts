import {logger} from 'firebase-functions';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {Task, TaskKind, TaskStatus} from './models/task.model';
import {FieldValue, UpdateData} from 'firebase-admin/firestore';
import {bucket, firestoreService} from './config';
import {Asset, AssetExportImport, AssetFile, AssetFolder, AssetKind} from './models/asset.model';
import * as os from 'os';
import * as fs from 'fs';
import * as archiver from 'archiver';

const TMP_EXPORT_FOLDER = `${os.tmpdir()}/export`;

// Firestore events
export const onTaskCreate = onDocumentCreated('spaces/{spaceId}/tasks/{taskId}', async (event) => {
  logger.info(`[Task::onTaskCreate] eventId='${event.id}'`);
  logger.info(`[Task::onTaskCreate] params='${event.params}'`);
  const {spaceId, taskId} = event.params;
  // No Data
  if (!event.data) return;
  const task = event.data.data() as Task;
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
  await event.data.ref.update(updateToInProgress);
  // Run Task
  if (task.kind === TaskKind.ASSET_EXPORT) {
    await assetExport(spaceId, task);
  } else if (task.kind === TaskKind.ASSET_IMPORT) {
    assetImport(task);
  } else if (task.kind === TaskKind.CONTENT_EXPORT) {
    contentExport();
  } else if (task.kind === TaskKind.CONTENT_IMPORT) {
    contentImport();
  }
});

/**
 * assetExport Job
 * @param spaceId original task
 */
async function assetExport(spaceId: string, task: Task) {
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

  // Create assets.json
  fs.mkdirSync(TMP_EXPORT_FOLDER);
  fs.writeFileSync(`${TMP_EXPORT_FOLDER}/assets.json`, JSON.stringify(exportAssets));

  // Create assets folder
  const assetsTmpFolder = `${TMP_EXPORT_FOLDER}/assets`;
  const assetsZipFile = `${os.tmpdir()}/assets.zip`;
  fs.mkdirSync(assetsTmpFolder);

  await Promise.all(
    exportAssets.filter((it) => it.kind === AssetKind.FILE)
      .map((asset) =>
        bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`)
          .download({destination: `${assetsTmpFolder}/${asset.id}`})
      )
  );
  const outputZip = fs.createWriteStream(assetsZipFile);
  const archive = archiver('zip', {zlib: {level: 9}});
  archive.pipe(outputZip)
  archive.directory(TMP_EXPORT_FOLDER, false)
  await archive.finalize()

  bucket.file(`spaces/${spaceId}/tasks/${task.id}/original`)
    .save(
      JSON.stringify(exportAssets),
      (err) => {
        if (err) {
          logger.error(err);
        }
      }
    );
}

function assetImport(task: Task) {

}

function contentExport() {

}

function contentImport() {

}
