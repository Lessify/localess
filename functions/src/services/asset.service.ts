import {firestoreService} from '../config';
import {Timestamp, DocumentReference, Query} from 'firebase-admin/firestore';
import Ajv, {ErrorObject} from 'ajv';
import {Asset, AssetExport, assetExportArraySchema, AssetFileExport, AssetFolderExport, AssetKind} from '../models/asset.model';
import {logger} from 'firebase-functions/v2';

/**
 * find Content by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} parentPath Full Slug path
 * @return {Query} document reference to the space
 */
export function findAssetsByParentPath(spaceId: string, parentPath: string): Query {
  return firestoreService.collection(`spaces/${spaceId}/assets`)
    .where('parentPath', '==', parentPath);
}

/**
 * find Assets by Full Slug
 * @param {string} spaceId Space identifier
 * @param {string} startParentPath Start Parent Path
 * @return {DocumentReference} document reference to the space
 */
export function findAssetsByStartFullSlug(spaceId: string, startParentPath: string): Query {
  logger.info(`[findAssetsByStartFullSlug] spaceId=${spaceId} startParentPath=${startParentPath}`);
  return firestoreService.collection(`spaces/${spaceId}/assets`)
    .where('parentPath', '>=', startParentPath)
    .where('parentPath', '<', `${startParentPath}~`);
}

/**
 * find Assets
 * @param {string} spaceId Space identifier
 * @param {number} fromDate Space identifier
 * @return {Query} document reference to the space
 */
export function findAssets(spaceId: string, fromDate?: number): Query {
  let assetsRef: Query = firestoreService.collection(`spaces/${spaceId}/assets`);
  if (fromDate) {
    assetsRef = assetsRef.where('updatedAt', '>=', Timestamp.fromMillis(fromDate));
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
 * @param {unknown} data Imported JSON
 * @return {ErrorObject[]} errors in case they exist
 */
export function validateAssetImport(data: unknown): ErrorObject[] | undefined | null {
  const ajv = new Ajv({discriminator: true});
  const validate = ajv.compile(assetExportArraySchema);
  if (validate(data)) {
    return undefined;
  } else {
    return validate.errors;
  }
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
    } as AssetFileExport;
  }
  return undefined;
}
