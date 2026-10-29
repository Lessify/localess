import { assetFilesPrefix } from '../data-rules/storage-deletions.js';
import { sanitizeFileName } from './file-name.js';

/**
 * The name a file asset's upload is stored under (`assets.original_name`): its file name made safe for any filesystem
 * or object store (`sanitizeFileName`), so storage shows what each file is. Never `renditions`, the folder of the
 * generated files next to it. Set once at upload; renaming the asset changes only `name`.
 */
export function toOriginalName(filename: string): string {
  const name = sanitizeFileName(filename);
  return name.toLowerCase() === 'renditions' ? `_${name}` : name;
}

/** The stored upload of a file asset: `spaces/{s}/assets/{id}/{original_name}`, renditions next to it. */
export const assetOriginalKey = (spaceId: string, assetId: string, originalName: string): string =>
  `${assetFilesPrefix(spaceId, assetId)}${originalName}`;
