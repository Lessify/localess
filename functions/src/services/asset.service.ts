import { DocumentReference, FieldValue, Query, Timestamp, UpdateData } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { bucket, firestoreService } from '../config';
import { Asset, AssetExport, AssetFile, AssetFileExport, AssetFileMetadata, AssetFolderExport, AssetKind } from '../models';
import fs from 'fs';
import os from 'os';
import { getExiftool, getFfmpeg, getSharp } from '../utils/lazy-modules';
import { resolveOrientedDimensions, resolveRotatedDimensions } from '../utils/media-orientation';
import { normaliseDuration } from '../utils/media-duration';
import { pickEmbeddedAlt } from '../utils/embedded-alt';
import { isAnimatedPages } from '../utils/image-transform';

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
export async function extractThumbnail(videoPath: string, outputImageName: string, time: string = '00:00:01'): Promise<void> {
  const outputPath = `${os.tmpdir()}/${outputImageName}`;
  if (fs.existsSync(outputPath)) return;
  const ffmpeg = await getFfmpeg();
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
    const exiftool = await getExiftool();
    if (asset.type.startsWith('image/')) {
      // Image
      const tags = await exiftool.read(tempFilePath);
      const { Duration, FileTypeExtension, ImageWidth, ImageHeight, Orientation } = tags;
      update.metadata = {
        type: 'image',
      };
      // Alt text is the field editors skip most, and it is an accessibility requirement rather
      // than a nicety. Anything from a stock library, a press wire or a photographer's export
      // already carries a caption, so an empty field gets a reasonable default. Never overwrites.
      const embeddedAlt = pickEmbeddedAlt(tags as Record<string, unknown>, asset.alt);
      if (embeddedAlt) {
        update.alt = embeddedAlt;
      }
      if (FileTypeExtension) {
        update.metadata.format = FileTypeExtension;
      }
      // Normalised rather than assigned raw. This branch used to store exiftool's value straight
      // through while the video branch below parsed it, so an animated GIF could hold a clock
      // string where a video beside it held seconds.
      const imageDuration = normaliseDuration(Duration);
      if (imageDuration !== undefined) {
        update.metadata.duration = imageDuration;
      }
      // exiftool reports the *stored* dimensions and the orientation tag separately, so these have
      // to be combined — reading the dimensions alone recorded a rotated portrait photo as
      // landscape, and transposed the width/height that `canonicalTransformSize` relies on.
      const { width, height, orientation } = resolveOrientedDimensions(ImageWidth, ImageHeight, Orientation);
      if (width !== undefined && height !== undefined) {
        update.metadata.width = width;
        update.metadata.height = height;
        update.metadata.orientation = orientation;
      }
      // sharp rather than exiftool for these two. `pages` is what lets the transform route reject
      // an oversized animation *before* downloading it, instead of downloading and probing to find
      // out. Header-only read, so it costs little — and it must not cost the asset its exiftool
      // data if sharp cannot parse the format.
      try {
        const sharp = await getSharp();
        const { pages, hasAlpha } = await sharp(tempFilePath).metadata();
        // Only a genuine animation is recorded: a static GIF reports `pages: 1` while a static
        // WebP reports nothing, so storing the raw value would make "has pages" meaningless.
        if (isAnimatedPages(pages)) {
          update.metadata.pages = pages;
        }
        if (hasAlpha !== undefined) {
          update.metadata.hasAlpha = hasAlpha;
        }
      } catch (e) {
        logger.warn(`[updateMetadataByRef] sharp could not read ${assetRef.path}`, e);
      }
    } else if (asset.type.startsWith('video/')) {
      // Video
      const metadata = await exiftool.read(tempFilePath);
      const { FileTypeExtension, Duration, ImageWidth, ImageHeight, Rotation } = metadata;
      update.metadata = {
        type: 'video',
      };
      if (FileTypeExtension) {
        update.metadata.format = FileTypeExtension;
      }
      // Handles both the clock form exiftool reports for WebM ('00:01:05.161000000') and the plain
      // number other containers give, so image and video agree on what `duration` means.
      const videoDuration = normaliseDuration(Duration);
      if (videoDuration !== undefined) {
        update.metadata.duration = videoDuration;
      }
      // A portrait phone video stores landscape dimensions and a rotation of 90, exactly as a
      // rotated photo stores landscape dimensions and an EXIF orientation tag. Reading the
      // dimensions without the rotation recorded it as landscape and transposed width/height.
      const rotated = resolveRotatedDimensions(ImageWidth, ImageHeight, Rotation);
      if (rotated.width !== undefined && rotated.height !== undefined) {
        update.metadata.width = rotated.width;
        update.metadata.height = rotated.height;
        update.metadata.orientation = rotated.orientation;
      }
    }
  } else {
    if (asset.kind === AssetKind.FILE && asset.inProgress) {
      await assetRef.update({
        inProgress: FieldValue.delete(),
      });
    }
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

/**
 * Returns true if any imported field differs from the existing Firestore asset document.
 * Compares name, parentPath, and kind for all asset types.
 * For FILE assets, also compares extension, type, size, alt, source, and metadata.
 * @param {Asset} existing - the current Firestore asset document
 * @param {AssetExport} imported - the asset data parsed from the import file
 * @return {boolean} true if at least one field has changed
 */
export function isAssetChanged(existing: Asset, imported: AssetExport): boolean {
  if (existing.name !== imported.name) return true;
  if (existing.parentPath !== imported.parentPath) return true;
  if (existing.kind !== imported.kind) return true;
  if (existing.kind === AssetKind.FILE && imported.kind === AssetKind.FILE) {
    const e = existing as AssetFile;
    const i = imported as AssetFileExport;
    if (e.extension !== i.extension) return true;
    if (e.type !== i.type) return true;
    if (e.size !== i.size) return true;
    if ((e.alt ?? undefined) !== (i.alt ?? undefined)) return true;
    if ((e.source ?? undefined) !== (i.source ?? undefined)) return true;
    if (!isAssetMetadataEqual(e.metadata, i.metadata)) return true;
  }
  return false;
}

/**
 * Returns true if two AssetMetadata objects differ in format, width, or height.
 * Handles the AssetMetadata union type by casting to the common base shape.
 * @param {AssetMetadata | undefined} a - first metadata object
 * @param {AssetMetadata | undefined} b - second metadata object
 * @return {boolean} true if both are equal
 */
export function isAssetMetadataEqual(a?: AssetFileMetadata, b?: AssetFileMetadata): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    (a as { format?: string; width?: number; height?: number }).format ===
      (b as { format?: string; width?: number; height?: number }).format &&
    (a as { width?: number }).width === (b as { width?: number }).width &&
    (a as { height?: number }).height === (b as { height?: number }).height
  );
}
