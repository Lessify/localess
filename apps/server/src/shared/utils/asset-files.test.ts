import { describe, expect, it } from 'vitest';

import { assetOriginalKey, toOriginalName } from './asset-files.js';

describe('toOriginalName', () => {
  it('keeps a plain file name, case and extension included', () => {
    expect(toOriginalName('Beach-Sunset_2024.JPG')).toBe('Beach-Sunset_2024.JPG');
  });

  it('makes any other name safe for a storage key', () => {
    expect(toOriginalName('my photo (1).png')).toBe('my-photo-1-.png');
    expect(toOriginalName('../../etc/passwd')).toBe('passwd');
    expect(toOriginalName('фото.jpg')).toBe('file.jpg');
    expect(toOriginalName('')).toBe('file');
  });

  it('never takes the name of the renditions folder', () => {
    expect(toOriginalName('renditions')).toBe('_renditions');
    expect(toOriginalName('Renditions')).toBe('_Renditions');
    expect(toOriginalName('renditions.png')).toBe('renditions.png');
  });
});

describe('assetOriginalKey', () => {
  it('stores the upload under the asset prefix, by its original name', () => {
    expect(assetOriginalKey('s1', 'a1', 'photo.jpg')).toBe('spaces/s1/assets/a1/photo.jpg');
  });
});
