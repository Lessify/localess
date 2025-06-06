import { DocumentReference, FieldValue, Query, Timestamp, UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { bucket, firestoreService } from '../config';
import { Asset, AssetExport, AssetFile, AssetFileExport, AssetFolderExport, AssetKind } from '../models';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import os from 'os';
import { exiftool } from 'exiftool-vendored';

/**
 * find Content by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} parentPath Full Slug path
 * @return {Query} document reference to the space
 */
export function findAllAssetsByParentPath(spaceId: string, parentPath: string): Query {
  return firestoreService.collection(`spaces/${spaceId}/assets`).where('parentPath', '==', parentPath);
}

/**
 * find Assets by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} startParentPath Start Parent Path
 * @return {DocumentReference} document reference to the space
 */
export function findAssetsByStartFullSlug(spaceId: string, startParentPath: string): Query {
  logger.info(`[findAssetsByStartFullSlug] spaceId=${spaceId} startParentPath=${startParentPath}`);
  return firestoreService
    .collection(`spaces/${spaceId}/assets`)
    .where('parentPath', '>=', startParentPath)
    .where('parentPath', '<', `${startParentPath}~`);
}

/**
 * find Assets
 * @param {string} spaceId Space identifier
 * @param {AssetKind} kind Asser Kind : FOLDER or FILE
 * @param {number} fromDate Space identifier
 * @return {Query} document reference to the space
 */
export function findAssets(spaceId: string, kind?: AssetKind, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/assets`);
  if (fromDate) {
    assetsRef = assetsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
  }
  if (kind) {
    assetsRef = assetsRef.where('kind', '==', kind);
  }
  return assetsRef;
}

/**
 * find Asset by ID
 * @param {string} spaceId Space identifier
 * @param {string} id Asset identifier
 * @return {DocumentReference} document reference to the space
 */
export function findAssetById(spaceId: string, id: string): DocumentReference {
  return firestoreService.doc(`spaces/${spaceId}/assets/${id}`);
}

/**
 * validate imported JSON
 * @param {string} docId Document ID
 * @param {Asset} asset Content
 * @return {ContentExport} exported content
 */
export function docAssetToExport(docId: string, asset: Asset): AssetExport | undefined {
  if (asset.kind === AssetKind.FOLDER) {
    return {
      id: docId,
      kind: AssetKind.FOLDER,
      name: asset.name,
      parentPath: asset.parentPath,
    } as AssetFolderExport;
  } else if (asset.kind === AssetKind.FILE) {
    return {
      id: docId,
      kind: AssetKind.FILE,
      name: asset.name,
      parentPath: asset.parentPath,
      extension: asset.extension,
      type: asset.type,
      size: asset.size,
      alt: asset.alt,
      metadata: asset.metadata,
      source: asset.source,
    } as AssetFileExport;
  }
  return undefined;
}

/**
 * Extract Thumbnail from a video
 * @param {string} videoPath - video path
 * @param {string} outputImageName - output file name
 * @param {string} time - time
 * @return {Promise<void>} - void
 */
export function extractThumbnail(videoPath: string, outputImageName: string, time: string = '00:00:01'): Promise<void> {
  const outputPath = `${os.tmpdir()}/${outputImageName}`;
  if (fs.existsSync(outputPath)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on('end', () => {
        if (fs.existsSync(outputPath)) {
          logger.info(`Thumbnail saved at: ${outputPath}`);
          resolve();
        } else {
          reject(new Error('Error: Screenshot was not generated!'));
        }
      })
      .on('error', err => reject(new Error(`FFmpeg Error: ${err.message}`)))
      .screenshots({
        timestamps: [time],
        filename: outputImageName,
        folder: os.tmpdir(),
      });
  });
}

/**
 * Update Asset Metadata
 * @param {string} assetRef - firestore asset reference
 */
export async function updateMetadataByRef(assetRef: DocumentReference): Promise<void> {
  const storagePath = `${assetRef.path}/original`;
  const assetDocSnapshot = await assetRef.get();
  const asset = assetDocSnapshot.data() as Asset;
  const update: UpdateData<AssetFile> = {
    inProgress: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (asset.kind === AssetKind.FILE && (asset.type.startsWith('image/') || asset.type.startsWith('video/'))) {
    const tempFilePath = `${os.tmpdir()}/assets-${assetRef.id}`;
    await bucket.file(storagePath).download({ destination: tempFilePath });
    if (asset.type.startsWith('image/')) {
      // Image
      const { Duration, FileTypeExtension, ImageWidth, ImageHeight } = await exiftool.read(tempFilePath);
      update.metadata = {
        type: 'image',
      };
      if (FileTypeExtension) {
        update.metadata.format = FileTypeExtension;
      }
      if (Duration) {
        update.metadata.duration = Duration;
      }
      // calculate orientation
      if (ImageWidth && ImageHeight) {
        update.metadata.height = ImageHeight;
        update.metadata.width = ImageWidth;
        if (ImageWidth > ImageHeight) {
          update.metadata.orientation = 'landscape';
        } else if (ImageHeight > ImageWidth) {
          update.metadata.orientation = 'portrait';
        } else {
          update.metadata.orientation = 'squarish';
        }
      }
    } else if (asset.type.startsWith('video/')) {
      // Video
      const metadata = await exiftool.read(tempFilePath);
      const { FileTypeExtension, Duration, ImageWidth, ImageHeight } = metadata;
      update.metadata = {
        type: 'video',
      };
      if (FileTypeExtension) {
        update.metadata.format = FileTypeExtension;
      }
      if (Duration) {
        if (typeof Duration === 'number') {
          update.metadata.duration = Number.parseInt(Duration.toString());
        } else if (typeof Duration === 'string') {
          // WebM Format Duration: '00:01:05.161000000'
          const strDuration = Duration as string;
          const ftr = [3600, 60, 1];
          const durationSplit = strDuration.split(':');
          if (durationSplit.length === 3) {
            update.metadata.duration = 0;
            for (let idx = 0; idx < durationSplit.length; idx++) {
              update.metadata.duration += Number.parseInt(durationSplit[idx]) * ftr[idx];
            }
          }
        }
      }
      // calculate orientation
      if (ImageWidth && ImageHeight) {
        update.metadata.height = ImageHeight;
        update.metadata.width = ImageWidth;
        if (ImageWidth > ImageHeight) {
          update.metadata.orientation = 'landscape';
        } else if (ImageHeight > ImageWidth) {
          update.metadata.orientation = 'portrait';
        } else {
          update.metadata.orientation = 'squarish';
        }
      }
    }
  } else {
    return;
  }
  await assetRef.update(update);
}
/**
 * Update Asset Metadata
 * @param {string} assetRefPath - firestore asset reference path
 */
export async function updateMetadataByPath(assetRefPath: string): Promise<void> {
  const assetRef = firestoreService.doc(assetRefPath);
  return updateMetadataByRef(assetRef);
}
