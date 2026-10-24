import { assetFilesPrefix } from '../../../shared/data-rules/storage-deletions.js';

/**
 * Files are stored under `spaces/{s}/assets/{id}/`: the upload by its `original_name`, and everything generated from it
 * in `renditions/`, named so storage shows what each file is (`w400.jpg`, `thumbnail.webp`). Renditions can be deleted
 * at any time: they are generated again on the next request.
 */
export { assetFilesPrefix as assetPrefix } from '../../../shared/data-rules/storage-deletions.js';
export { assetOriginalKey as originalKey } from '../../../shared/utils/asset-files.js';

/** What defines a rendition's bytes besides its format. */
export interface RenditionName {
  width?: number;
  height?: number;
  quality?: number;
  fit?: string;
  /** A still frame (`?thumbnail`): the first frame of an animation, a frame of a video. */
  frame: boolean;
}

/**
 * A cached rendition of the transform route: its parameters in a fixed order, the output format as its extension
 * (`w800-h600-q60-fit-cover.avif`, `w200-frame.webp`; `full.jpg` for a bare re-encode). Equal requests share one file.
 */
export function renditionKey(spaceId: string, assetId: string, rendition: RenditionName, extension: string): string {
  const { width, height, quality, fit, frame } = rendition;
  const name = [
    width ? `w${width}` : '',
    height ? `h${height}` : '',
    quality !== undefined ? `q${quality}` : '',
    fit ? `fit-${fit}` : '',
    frame ? 'frame' : '',
  ]
    .filter(Boolean)
    .join('-');
  return `${assetFilesPrefix(spaceId, assetId)}renditions/${name || 'full'}${extension}`;
}

/** The platform thumbnail (`GET /api/app/…/assets/:id/thumbnail`); no transform name starts with `thumbnail` or `preview`. */
export const thumbnailKey = (spaceId: string, assetId: string): string => `${assetFilesPrefix(spaceId, assetId)}renditions/thumbnail.webp`;

/** The platform preview (`GET /api/app/…/assets/:id/preview`), beside the thumbnail. */
export const previewKey = (spaceId: string, assetId: string): string => `${assetFilesPrefix(spaceId, assetId)}renditions/preview.webp`;
