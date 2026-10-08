/**
 * Builds the ETag for an asset response.
 *
 * Identity is the stored object plus the transform that produced the bytes. `suffix` is
 * already derived from the *clamped* dimensions and the *resolved* format, so two
 * requested widths that resolve to the same output share a tag. `thumbnail` is carried
 * separately because it changes the bytes without appearing in the suffix.
 * @param {string} md5Hash MD5 of the stored original, from Storage object metadata
 * @param {string} suffix Transform suffix, empty for an untransformed original
 * @param {boolean} thumbnail Whether the thumbnail variant was produced
 * @return {string} a quoted ETag value
 */
export function buildAssetETag(md5Hash: string, suffix: string, thumbnail: boolean): string {
  return `"${md5Hash}-${suffix || 'orig'}${thumbnail ? '-thumbnail' : ''}"`;
}
