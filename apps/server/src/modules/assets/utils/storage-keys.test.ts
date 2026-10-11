import { describe, expect, it } from 'vitest';

import { assetPrefix, originalKey, renditionKey } from './storage-keys.js';

describe('asset storage keys', () => {
  it('stores the upload as `original` under the asset prefix', () => {
    expect(originalKey('s1', 'a1')).toBe('spaces/s1/assets/a1/original');
  });

  it('keys a rendition by what defines its bytes: the transform suffix and whether it is a thumbnail', () => {
    expect(renditionKey('s1', 'a1', 'w200-webp', false)).toBe('spaces/s1/assets/a1/renditions/w200-webp');
    expect(renditionKey('s1', 'a1', 'w200-webp', true)).toBe('spaces/s1/assets/a1/renditions/w200-webp-thumbnail');
    expect(renditionKey('s1', 'a1', '', false)).toBe('spaces/s1/assets/a1/renditions/orig');
  });

  it('keeps every file of an asset under its prefix, so deleting the prefix deletes them all', () => {
    const prefix = assetPrefix('s1', 'a1');
    expect(prefix).toBe('spaces/s1/assets/a1/');
    expect(originalKey('s1', 'a1').startsWith(prefix)).toBe(true);
    expect(renditionKey('s1', 'a1', 'w10', true).startsWith(prefix)).toBe(true);
  });
});
