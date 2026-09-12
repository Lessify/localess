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
  SchemaExport,
  Space,
  Task,
  TaskAssetExport,
  TaskContentExport,
  TaskExportMetadata,
  TaskImport,
  TaskKind,
  TaskLog,
  TaskLogLevel,
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
import { BATCH_MAX, bucket, firestoreService } from './config';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import {
  docAssetToExport,
  docContentToExport,
  findAssetById,
  findAssets,
  applySchemaPushPlan,
  docSchemaToExport,
  findAssetsByStartFullSlug,
  findContentByFullSlug,
  findContentById,
  findContents,
  findContentsByStartFullSlug,
  findSchemas,
  findSpaceById,
  findTranslationById,
  findTranslations,
  generateTranslationsDraft,
  planSchemaPush,
  isAssetChanged,
  isContentChanged,
  isTranslationChanged,
  updateMetadataByRef,
} from './services';
import { tmpdir } from 'os';
import { getArchiver, getUnzipper } from './utils/lazy-modules';
import { ZodError } from 'zod';

const TMP_TASK_FOLDER = `${tmpdir()}/task-`;
const MAX_VALIDATION_ISSUES = 5;
const DOWNLOAD_PROGRESS_INTERVAL = 50;
const ZIP_OPERATION_TIMEOUT_MS = 5 * 60_000;

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

/**
 * Zip the contents of a directory (flattened, without an extra top-level folder) into a file.
 * @param {string} sourceDir directory whose contents get zipped
 * @param {string} destZipPath output zip file path
 * @return {Promise<void>}
 */
async function compressDir(sourceDir: string, destZipPath: string): Promise<void> {
  const archiver = await getArchiver();
  return new Promise<void>((resolve, reject) => {
    const output = createWriteStream(destZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize().catch(reject);
  });
}

/**
 * Extract a zip file into a directory.
 * @param {string} zipPath zip file to extract
 * @param {string} destDir destination directory
 * @return {Promise<void>}
 */
async function uncompressZip(zipPath: string, destDir: string): Promise<void> {
  const unzipper = await getUnzipper();
  // eslint-disable-next-line new-cap
  const extractStream = unzipper.Extract({ path: destDir });
  return createReadStream(zipPath).pipe(extractStream).promise();
}

/**
 * Best-effort removal of local temp files/directories created while processing a task. Cloud
 * Functions instances are reused across many invocations, so anything left in /tmp accumulates
 * indefinitely on a warm instance unless explicitly cleaned up here. Never throws - a cleanup
 * failure must not mask the task's actual result.
 * @param {string[]} paths absolute paths to remove (files or directories)
 * @return {void}
 */
function cleanupTmpPaths(paths: string[]): void {
  for (const path of paths) {
    try {
      rmSync(path, { recursive: true, force: true });
    } catch (error: any) {
      logger.warn(`[cleanupTmpPaths] Failed to remove '${path}': ${error.message}`);
    }
  }
}

/**
 * Reject with a clear timeout error if the given promise doesn't settle in time. Guards calls
 * into the `compressing` library, which can hang indefinitely on certain zip files instead of
 * resolving or rejecting - something a plain try/catch cannot detect on its own.
 * @param {Promise} promise promise to guard
 * @param {string} label operation name, used in the timeout error message
 * @return {Promise} the original promise's result, or a timeout rejection
 */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ZIP_OPERATION_TIMEOUT_MS}ms`)), ZIP_OPERATION_TIMEOUT_MS);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Summarize a ZodError into a short, human-readable string instead of dumping the full error
 * object, which can be enormous (and unreadable in a table cell) for large arrays with many
 * invalid entries.
 * @param {ZodError} error zod validation error
 * @return {string}
 */
function formatZodError(error: ZodError): string {
  const total = error.issues.length;
  const shown = error.issues.slice(0, MAX_VALIDATION_ISSUES).map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
  const suffix = total > MAX_VALIDATION_ISSUES ? ` (+${total - MAX_VALIDATION_ISSUES} more)` : '';
  return `${total} validation issue${total === 1 ? '' : 's'} - ${shown.join('; ')}${suffix}`;
}

/**
 * Extract a message and trace from a thrown value, falling back to a JSON dump when it isn't an
 * Error instance (e.g. a thrown string or plain object) so no diagnostic detail is silently lost.
 * @param {unknown} error thrown value
 * @return {object} message and optional trace
 */
function describeError(error: unknown): { message: string; trace?: string } {
  if (error instanceof Error) {
    return { message: error.message, trace: error.stack };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
}

/**
 * Log a single task execution step: writes to Cloud Logging (console) and persists it to the
 * task's `logs` subcollection so it is visible in the Tasks UI. This is the single entry point
 * every job function should use instead of calling `logger.info`/`logger.warn`/`logger.error` directly.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {TaskLogLevel} level severity of this step
 * @param {string} scope short name of the calling function, used only for the console message prefix
 * @param {string} message human-readable description of the step, persisted as-is (no prefix)
 * @param {string} trace optional stack trace / error detail, ERROR level only
 * @return {Promise<void>}
 */
async function logTaskStep(
  spaceId: string,
  taskId: string,
  level: TaskLogLevel,
  scope: string,
  message: string,
  trace?: string
): Promise<void> {
  const consoleMessage = `[Task:onCreate:${scope}] ${message}`;
  if (level === TaskLogLevel.ERROR) {
    logger.error(consoleMessage);
  } else if (level === TaskLogLevel.WARN) {
    logger.warn(consoleMessage);
  } else {
    logger.info(consoleMessage);
  }
  try {
    const log: WithFieldValue<TaskLog> = { level, message, createdAt: FieldValue.serverTimestamp() };
    if (trace) log.trace = trace;
    await firestoreService.collection(`spaces/${spaceId}/tasks/${taskId}/logs`).add(log);
  } catch (error: any) {
    logger.error(`[logTaskStep] Failed to log task step: ${error.message}`);
  }
}

// Firestore events
const onTaskCreate = onDocumentCreated(
  {
    document: 'spaces/{spaceId}/tasks/{taskId}',
    memory: '4GiB',
    timeoutSeconds: 540,
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
      try {
        await bucket.file(task.tmpPath).move(newPath);
        (updateToInProgress as UpdateData<TaskImport>).tmpPath = FieldValue.delete();
      } catch (error: unknown) {
        const { message, trace } = describeError(error);
        await logTaskStep(spaceId, taskId, TaskLogLevel.ERROR, 'onCreate', message, trace);
        await event.data.ref.update({
          status: TaskStatus.ERROR,
          message,
          trace,
          updatedAt: FieldValue.serverTimestamp(),
        } as UpdateData<Task>);
        return;
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

    try {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'onCreate', `Starting ${task.kind} processing`);
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
        await assetRegenerateMetadata(spaceId, taskId);
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
        const metadata = await schemasExport(spaceId, taskId);
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
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'onCreate', 'Task finished successfully');
    } catch (error: unknown) {
      const { message, trace } = describeError(error);
      updateToFinished.status = TaskStatus.ERROR;
      updateToFinished.message = message;
      updateToFinished.trace = trace;
      await logTaskStep(spaceId, taskId, TaskLogLevel.ERROR, 'onCreate', message, trace);
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
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const assetsExportZipFile = `${tmpdir()}/assets-${taskId}.zip`;
  try {
    return await assetsExportRun(spaceId, taskId, task, tmpTaskFolder, assetsExportZipFile);
  } finally {
    cleanupTmpPaths([tmpTaskFolder, assetsExportZipFile]);
  }
}

/**
 * assetsExport body, run inside a try/finally by assetsExport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @param {string} assetsExportZipFile pre-computed local zip file path for this task
 * @return {Promise<any>}
 */
async function assetsExportRun(
  spaceId: string,
  taskId: string,
  task: TaskAssetExport,
  tmpTaskFolder: string,
  assetsExportZipFile: string
): Promise<any> {
  const exportAssets: (AssetExport | undefined)[] = [];
  if (task.path) {
    // Only specific folder or asset
    const rootAssetSnapshot = await findAssetById(spaceId, task.path).get();
    if (rootAssetSnapshot.exists) {
      const rootAsset = rootAssetSnapshot.data() as Asset;
      exportAssets.push(docAssetToExport(rootAssetSnapshot.id, rootAsset));
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `root id=${rootAssetSnapshot.id} name=${rootAsset.name}`);
      // folder, all sub documents
      if (rootAsset.kind === AssetKind.FOLDER) {
        const startParentPath = rootAsset.parentPath === '' ? rootAssetSnapshot.id : `${rootAsset.parentPath}/${rootAssetSnapshot.id}`;
        const assetsSnapshot = await findAssetsByStartFullSlug(spaceId, startParentPath).get();
        for (const doc of assetsSnapshot.docs) {
          const asset = doc.data() as Asset;
          exportAssets.push(docAssetToExport(doc.id, asset));
          await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `sub-folder id=${doc.id} name=${asset.name}`);
        }
      }
      // it is not located in root folder, requires to extract all folder till
      if (rootAsset.parentPath !== '') {
        const assetIds = rootAsset.parentPath.split('/');
        for (const assetId of assetIds) {
          const assetSnapshot = await findAssetById(spaceId, assetId).get();
          const asset = assetSnapshot.data() as Asset;
          await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `path id=${assetSnapshot.id} name=${asset.name}`);
          exportAssets.push(docAssetToExport(assetSnapshot.id, asset));
        }
      }
    } else {
      // path not exist
    }
  } else {
    // Export Everything
    const assetsSnapshot = await findAssets(spaceId).get();
    const existingDocs = assetsSnapshot.docs.filter(it => it.exists);
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `exporting all ${existingDocs.length} assets`);
    existingDocs.forEach(doc => {
      const asset = doc.data() as Asset;
      exportAssets.push(docAssetToExport(doc.id, asset));
    });
  }
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
  mkdirSync(assetsTmpFolder);

  const fileAssetsCount = exportAssets.filter(asset => asset && asset.kind === AssetKind.FILE).length;
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `downloading ${fileAssetsCount} files`);
  let downloadedCount = 0;
  for (const asset of exportAssets) {
    if (asset && asset.kind === AssetKind.FILE) {
      await bucket.file(`spaces/${spaceId}/assets/${asset.id}/original`).download({ destination: `${assetsTmpFolder}/${asset.id}` });
      downloadedCount++;
      if (downloadedCount % DOWNLOAD_PROGRESS_INTERVAL === 0) {
        await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `downloaded ${downloadedCount}/${fileAssetsCount} files`);
      }
    }
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', `all ${fileAssetsCount} files downloaded`);
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', 'zip started');
  await withTimeout(compressDir(tmpTaskFolder, assetsExportZipFile), 'zip compress');
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', 'zip completed');
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', 'zip uploading');
  await bucket.upload(assetsExportZipFile, {
    destination: `spaces/${spaceId}/tasks/${taskId}/original`,
    resumable: false,
    chunkSize: 5 * 1024 * 1024,
  });
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', 'zip uploaded');
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsExport', 'save metadata');
  return metadata;
}

/**
 * assetImport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function assetsImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  try {
    return await assetsImportRun(spaceId, taskId, tmpTaskFolder);
  } finally {
    cleanupTmpPaths([tmpTaskFolder]);
  }
}

/**
 * assetsImport body, run inside a try/finally by assetsImport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @return {Promise<ZodError | undefined | string>}
 */
async function assetsImportRun(spaceId: string, taskId: string, tmpTaskFolder: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', 'downloading original file');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', 'uncompressing archive');
  await withTimeout(uncompressZip(zipPath, tmpTaskFolder), 'zip uncompress');
  const assets = JSON.parse(readFileSync(`${tmpTaskFolder}/assets.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'ASSET') return 'WRONG_METADATA';
  const parse = zAssetExportArraySchema.safeParse(assets);
  if (!parse.success) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.WARN, 'assetsImport', formatZodError(parse.error));
    return parse.error;
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', `valid=${assets.length}`);

  // Load all existing assets into a map to avoid per-document reads
  const origAssetMap = new Map<string, Asset>();
  const assetsSnapshot = await findAssets(spaceId).get();
  assetsSnapshot.docs.filter(it => it.exists).forEach(it => origAssetMap.set(it.id, it.data() as Asset));

  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
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
          batch.update(assetRef, update);
        } else if (asset.kind === AssetKind.FOLDER) {
          const update: UpdateData<AssetFolder> = {
            name: asset.name,
            parentPath: asset.parentPath,
            updatedAt: FieldValue.serverTimestamp(),
          };
          batch.update(assetRef, update);
        }
        totalChanges++;
        count++;
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
    }
    if (count === BATCH_MAX) {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', 'batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', 'batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  for (const [key, value] of ids) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', `Save File ${key}`);
    await streamFileToStorage(value, `spaces/${spaceId}/assets/${key}/original`);
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsImport', 'total changes : ' + totalChanges);
  return undefined;
}

/**
 * Asset Regenerate Metadata Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function assetRegenerateMetadata(spaceId: string, taskId: string): Promise<void> {
  const assetsSnapshot = await findAssets(spaceId, AssetKind.FILE).get();
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsRegenMetadata', `found ${assetsSnapshot.docs.length} assets to regenerate`);
  let count = 0;
  for (const assetSnapshot of assetsSnapshot.docs) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsRegenMetadata', 'asset : ' + assetSnapshot.ref.path);
    await updateMetadataByRef(assetSnapshot.ref);
    count++;
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'assetsRegenMetadata', 'total regenerated : ' + count);
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function contentsExport(spaceId: string, taskId: string, task: TaskContentExport): Promise<any> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const contentsExportZipFile = `${tmpdir()}/contents-${taskId}.zip`;
  try {
    return await contentsExportRun(spaceId, taskId, task, tmpTaskFolder, contentsExportZipFile);
  } finally {
    cleanupTmpPaths([tmpTaskFolder, contentsExportZipFile]);
  }
}

/**
 * contentsExport body, run inside a try/finally by contentsExport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @param {string} contentsExportZipFile pre-computed local zip file path for this task
 * @return {Promise<any>}
 */
async function contentsExportRun(
  spaceId: string,
  taskId: string,
  task: TaskContentExport,
  tmpTaskFolder: string,
  contentsExportZipFile: string
): Promise<any> {
  const exportContents: (ContentExport | undefined)[] = [];
  if (task.path) {
    // Only specific folder or document
    const rootContentSnapshot = await findContentById(spaceId, task.path).get();
    if (rootContentSnapshot.exists) {
      const rootContent = rootContentSnapshot.data() as Content;
      exportContents.push(docContentToExport(rootContentSnapshot.id, rootContent));
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', `root fullSlug=${rootContent.fullSlug}`);
      // folder, all sub documents
      if (rootContent.kind === ContentKind.FOLDER) {
        const contentsSnapshot = await findContentsByStartFullSlug(spaceId, `${rootContent.fullSlug}/`).get();
        for (const doc of contentsSnapshot.docs) {
          const content = doc.data() as Content;
          exportContents.push(docContentToExport(doc.id, content));
          await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', `sub-folder fullSlug=${content.fullSlug}`);
        }
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
          for (const doc of contentsSnapshot.docs) {
            const content = doc.data() as Content;
            await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', `path fullSlug=${content.fullSlug}`);
            exportContents.push(docContentToExport(doc.id, content));
          }
        }
      }
    } else {
      // path not exist
    }
  } else {
    // Export Everything
    const contentsSnapshot = await findContents(spaceId).get();
    const existingDocs = contentsSnapshot.docs.filter(it => it.exists);
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', `exporting all ${existingDocs.length} contents`);
    existingDocs.forEach(doc => {
      const content = doc.data() as Content;
      exportContents.push(docContentToExport(doc.id, content));
    });
  }
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

  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', 'zip started');
  await withTimeout(compressDir(tmpTaskFolder, contentsExportZipFile), 'zip compress');
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', 'zip completed');

  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', 'zip uploading');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(contentsExportZipFile));
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', 'zip uploaded');
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsExport', 'save metadata');
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function contentsImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  try {
    return await contentsImportRun(spaceId, taskId, tmpTaskFolder);
  } finally {
    cleanupTmpPaths([tmpTaskFolder]);
  }
}

/**
 * contentsImport body, run inside a try/finally by contentsImport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @return {Promise<ZodError | undefined | string>}
 */
async function contentsImportRun(spaceId: string, taskId: string, tmpTaskFolder: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsImport', 'downloading original file');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsImport', 'uncompressing archive');
  await withTimeout(uncompressZip(zipPath, tmpTaskFolder), 'zip uncompress');
  const contents = JSON.parse(readFileSync(`${tmpTaskFolder}/contents.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'CONTENT') return 'WRONG_METADATA';
  const parse = zContentExportArraySchema.safeParse(contents);
  if (!parse.success) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.WARN, 'contentsImport', formatZodError(parse.error));
    return parse.error;
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsImport', `valid=${contents.length}`);

  // Load all existing contents into a map to avoid per-document reads
  const origContentMap = new Map<string, Content>();
  const contentsSnapshot = await findContents(spaceId).get();
  contentsSnapshot.docs.filter(it => it.exists).forEach(it => origContentMap.set(it.id, it.data() as Content));

  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
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
        totalChanges++;
        count++;
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
      totalChanges++;
      count++;
    }
    if (count === BATCH_MAX) {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsImport', 'batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsImport', 'batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'contentsImport', 'total changes : ' + totalChanges);
  // The Draft Generation will be executed on the onDocumentUpdated
  return undefined;
}

/**
 * contentExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function schemasExport(spaceId: string, taskId: string): Promise<any> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const schemasExportZipFile = `${tmpdir()}/schemas-${taskId}.zip`;
  try {
    return await schemasExportRun(spaceId, taskId, tmpTaskFolder, schemasExportZipFile);
  } finally {
    cleanupTmpPaths([tmpTaskFolder, schemasExportZipFile]);
  }
}

/**
 * schemasExport body, run inside a try/finally by schemasExport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @param {string} schemasExportZipFile pre-computed local zip file path for this task
 * @return {Promise<any>}
 */
async function schemasExportRun(spaceId: string, taskId: string, tmpTaskFolder: string, schemasExportZipFile: string): Promise<any> {
  const schemasSnapshot = await findSchemas(spaceId).get();
  const exportSchemas = schemasSnapshot.docs.filter(it => it.exists).map(doc => docSchemaToExport(doc.id, doc.data() as Schema));
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasExport', `exporting all ${exportSchemas.length} schemas`);

  const fileMetadata: TaskExportMetadata = {
    kind: 'SCHEMA',
  };
  // Create TMP Folder
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/schemas.json`, JSON.stringify(exportSchemas));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasExport', 'zip started');
  await withTimeout(compressDir(tmpTaskFolder, schemasExportZipFile), 'zip compress');
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasExport', 'zip completed');

  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasExport', 'zip uploading');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(schemasExportZipFile));
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasExport', 'zip uploaded');
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasExport', 'save metadata');
  return metadata;
}

/**
 * content Import Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 */
async function schemasImport(spaceId: string, taskId: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  try {
    return await schemasImportRun(spaceId, taskId, tmpTaskFolder);
  } finally {
    cleanupTmpPaths([tmpTaskFolder]);
  }
}

/**
 * schemasImport body, run inside a try/finally by schemasImport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @return {Promise<ZodError | undefined | string>}
 */
async function schemasImportRun(spaceId: string, taskId: string, tmpTaskFolder: string): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasImport', 'Started');
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasImport', 'downloading original file');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasImport', 'uncompressing archive');
  await withTimeout(uncompressZip(zipPath, tmpTaskFolder), 'zip uncompress');
  const schemas = JSON.parse(readFileSync(`${tmpTaskFolder}/schemas.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'SCHEMA') return 'WRONG_METADATA';
  const parse = zSchemaExportArraySchema.safeParse(schemas);
  if (!parse.success) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.WARN, 'schemasImport', formatZodError(parse.error));
    return parse.error;
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasImport', `valid=${schemas.length}`);

  // Load all existing schemas into a map to avoid per-document reads
  const origSchemaMap = new Map<string, Schema>();
  const schemasSnapshot = await findSchemas(spaceId).get();
  schemasSnapshot.docs.filter(it => it.exists).forEach(it => origSchemaMap.set(it.id, it.data() as Schema));

  // Import semantics are upsert: never deletes schemas absent from the file.
  const plan = planSchemaPush(origSchemaMap, parse.data as SchemaExport[], 'upsert');
  await applySchemaPushPlan(spaceId, plan);
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'schemasImport', 'total changes : ' + (plan.creates.length + plan.updates.length));
  return undefined;
}

/**
 * translationsExport Job
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 */
async function translationsExport(spaceId: string, taskId: string, task: TaskTranslationExport): Promise<any> {
  const tmpTaskFolder = TMP_TASK_FOLDER + taskId;
  const translationsExportZipFile = `${tmpdir()}/translations-${taskId}.zip`;
  try {
    return await translationsExportRun(spaceId, taskId, task, tmpTaskFolder, translationsExportZipFile);
  } finally {
    cleanupTmpPaths([tmpTaskFolder, translationsExportZipFile]);
  }
}

/**
 * translationsExport body, run inside a try/finally by translationsExport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @param {string} translationsExportZipFile pre-computed local zip file path for this task
 * @return {Promise<any>}
 */
async function translationsExportRun(
  spaceId: string,
  taskId: string,
  task: TaskTranslationExport,
  tmpTaskFolder: string,
  translationsExportZipFile: string
): Promise<any> {
  const exportTranslations: TranslationExport[] = [];
  const translationsSnapshot = await findTranslations(spaceId).get();
  const existingDocs = translationsSnapshot.docs.filter(it => it.exists);
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExport', `exporting all ${existingDocs.length} translations`);
  existingDocs.forEach(doc => {
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
  const fileMetadata: TaskExportMetadata = {
    kind: 'TRANSLATION',
  };
  mkdirSync(tmpTaskFolder);
  // Create assets.json
  writeFileSync(`${tmpTaskFolder}/translations.json`, JSON.stringify(exportTranslations));
  writeFileSync(`${tmpTaskFolder}/metadata.json`, JSON.stringify(fileMetadata));

  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExport', 'zip started');
  await withTimeout(compressDir(tmpTaskFolder, translationsExportZipFile), 'zip compress');
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExport', 'zip completed');

  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExport', 'zip uploading');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(readFileSync(translationsExportZipFile));
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExport', 'zip uploaded');
  const [metadata] = await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).getMetadata();
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExport', 'save metadata');
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
  const translationsSnapshot = await findTranslations(spaceId).get();
  const existingDocs = translationsSnapshot.docs.filter(it => it.exists);
  await logTaskStep(
    spaceId,
    taskId,
    TaskLogLevel.INFO,
    'translationsExportJsonFlat',
    `exporting ${existingDocs.length} translations for locale ${task.locale}`
  );
  existingDocs.forEach(doc => {
    const translation = doc.data() as Translation;
    if (task.locale) {
      const locale = translation.locales[task.locale];
      if (locale) {
        exportTranslations[doc.id] = locale;
      }
    }
  });
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExportJsonFlat', 'uploading json');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).save(JSON.stringify(exportTranslations));
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsExportJsonFlat', 'uploaded json');
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
  try {
    return await translationsImportRun(spaceId, taskId, tmpTaskFolder);
  } finally {
    cleanupTmpPaths([tmpTaskFolder]);
  }
}

/**
 * translationsImport body, run inside a try/finally by translationsImport() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @return {Promise<ZodError | undefined | string>}
 */
async function translationsImportRun(
  spaceId: string,
  taskId: string,
  tmpTaskFolder: string
): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  mkdirSync(tmpTaskFolder);
  const zipPath = `${tmpTaskFolder}/task.zip`;
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', 'downloading original file');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: zipPath });
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', 'uncompressing archive');
  await withTimeout(uncompressZip(zipPath, tmpTaskFolder), 'zip uncompress');
  const translations = JSON.parse(readFileSync(`${tmpTaskFolder}/translations.json`).toString());
  const fileMetadata: TaskExportMetadata = JSON.parse(readFileSync(`${tmpTaskFolder}/metadata.json`).toString());
  if (fileMetadata.kind !== 'TRANSLATION') return 'WRONG_METADATA';
  const parse = zTranslationExportArraySchema.safeParse(translations);
  if (!parse.success) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.WARN, 'translationsImport', formatZodError(parse.error));
    return parse.error;
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', `valid=${translations.length}`);

  // Load all existing translations into a map to avoid per-document reads
  const origTransMap = new Map<string, Translation>();
  const translationsSnapshot = await findTranslations(spaceId).get();
  translationsSnapshot.docs.filter(it => it.exists).forEach(it => origTransMap.set(it.id, it.data() as Translation));

  let totalChanges = 0;
  let count = 0;
  let batch = firestoreService.batch();
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
        batch.update(translationRef, update);
        totalChanges++;
        count++;
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
      batch.set(translationRef, add);
      totalChanges++;
      count++;
    }
    if (count === BATCH_MAX) {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', 'batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', 'batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', 'total changes : ' + totalChanges);
  if (totalChanges > 0) {
    // Generate draft files once after all translations are imported
    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (spaceSnapshot.exists) {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImport', 'Generating draft files');
      await generateTranslationsDraft(spaceId, spaceSnapshot.data() as Space);
    }
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
  try {
    return await translationsImportJsonFlatRun(spaceId, taskId, task, tmpTaskFolder);
  } finally {
    cleanupTmpPaths([tmpTaskFolder]);
  }
}

/**
 * translationsImportJsonFlat body, run inside a try/finally by translationsImportJsonFlat() so temp files always get cleaned up.
 * @param {string} spaceId original task
 * @param {string} taskId original task
 * @param {Task} task original task
 * @param {string} tmpTaskFolder pre-computed local temp folder for this task
 * @return {Promise<ZodError | undefined | string>}
 */
async function translationsImportJsonFlatRun(
  spaceId: string,
  taskId: string,
  task: TaskTranslationImport,
  tmpTaskFolder: string
): Promise<ZodError | undefined | 'WRONG_METADATA'> {
  mkdirSync(tmpTaskFolder);
  const jsonPath = `${tmpTaskFolder}/task.json`;
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImportJsonFlat', 'downloading original file');
  await bucket.file(`spaces/${spaceId}/tasks/${taskId}/original`).download({ destination: jsonPath });
  const translations: Record<string, string> = JSON.parse(readFileSync(jsonPath).toString());
  if (task.locale === undefined) return 'WRONG_METADATA';
  const parse = zTranslationFlatExportSchema.safeParse(translations);
  if (!parse.success) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.WARN, 'translationsImportJsonFlat', formatZodError(parse.error));
    return parse.error;
  }
  await logTaskStep(
    spaceId,
    taskId,
    TaskLogLevel.INFO,
    'translationsImportJsonFlat',
    `valid=${Object.getOwnPropertyNames(translations).length}`
  );
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
        count++;
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
      count++;
    }
    if (count === BATCH_MAX) {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImportJsonFlat', 'batch.commit() : ' + totalChanges);
      await batch.commit();
      batch = firestoreService.batch();
      count = 0;
    }
  }
  if (count > 0) {
    await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImportJsonFlat', 'batch.commit() : ' + totalChanges);
    await batch.commit();
  }
  await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImportJsonFlat', 'total changes : ' + totalChanges);
  if (totalChanges > 0) {
    // Generate draft files once after all translations are imported
    const spaceSnapshot = await findSpaceById(spaceId).get();
    if (spaceSnapshot.exists) {
      await logTaskStep(spaceId, taskId, TaskLogLevel.INFO, 'translationsImportJsonFlat', 'Generating draft files');
      await generateTranslationsDraft(spaceId, spaceSnapshot.data() as Space);
    }
  }
  return undefined;
}

const onTaskDeleted = onDocumentDeleted('spaces/{spaceId}/tasks/{taskId}', async event => {
  logger.info(`[Task:onDeleted] eventId='${event.id}'`);
  logger.info(`[Task:onDeleted] params='${JSON.stringify(event.params)}'`);
  const { spaceId, taskId } = event.params;
  // No Data
  if (!event.data) return;
  await Promise.all([
    bucket.deleteFiles({
      prefix: `spaces/${spaceId}/tasks/${taskId}`,
    }),
    firestoreService.recursiveDelete(event.data.ref),
  ]);
});

export const task = {
  oncreate: onTaskCreate,
  ondelete: onTaskDeleted,
};
