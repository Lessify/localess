import { describe, expect, it } from 'vitest';

import { assetPrefix, originalKey, renditionKey, thumbnailKey } from './storage-keys.js';

describe('asset storage keys', () => {
  it('stores the upload by its original name under the asset prefix', () => {
    expect(originalKey('s1', 'a1', 'photo.jpg')).toBe('spaces/s1/assets/a1/photo.jpg');
  });

  it('names a rendition by what defines its bytes, in a fixed order, with its format as the extension', () => {
    expect(renditionKey('s1', 'a1', { width: 400, frame: false }, '.jpg')).toBe('spaces/s1/assets/a1/renditions/w400.jpg');
    expect(renditionKey('s1', 'a1', { width: 800, height: 600, quality: 60, fit: 'cover', frame: false }, '.avif')).toBe(
      'spaces/s1/assets/a1/renditions/w800-h600-q60-fit-cover.avif',
    );
    expect(renditionKey('s1', 'a1', { width: 200, frame: true }, '.webp')).toBe('spaces/s1/assets/a1/renditions/w200-frame.webp');
    expect(renditionKey('s1', 'a1', { frame: false }, '.png')).toBe('spaces/s1/assets/a1/renditions/full.png');
  });

  it('keeps the platform thumbnail with the renditions, apart from any transform', () => {
    expect(thumbnailKey('s1', 'a1')).toBe('spaces/s1/assets/a1/renditions/thumbnail.webp');
  });

  it('keeps every file of an asset under its prefix, so deleting the prefix deletes them all', () => {
    const prefix = assetPrefix('s1', 'a1');
    expect(prefix).toBe('spaces/s1/assets/a1/');
    expect(originalKey('s1', 'a1', 'photo.jpg').startsWith(prefix)).toBe(true);
    expect(renditionKey('s1', 'a1', { width: 10, frame: true }, '.webp').startsWith(prefix)).toBe(true);
    expect(thumbnailKey('s1', 'a1').startsWith(prefix)).toBe(true);
  });
});
