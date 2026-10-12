import { describe, expect, it } from 'vitest';
import { Asset, AssetExport, Translation, TranslationExport } from '@localess/shared';
import { isAssetChanged, isLocalesEqual, isTranslationChanged } from './import-diff.js';

describe('isAssetChanged', () => {
  const file = {
    kind: 'FILE',
    name: 'logo',
    parentPath: '',
    extension: '.png',
    type: 'image/png',
    size: 10,
    metadata: { format: 'png', width: 1, height: 2 },
  };
  it('ignores metadata beyond format and dimensions', () => {
    expect(
      isAssetChanged(
        file as unknown as Asset,
        { ...file, id: 'a', metadata: { format: 'png', width: 1, height: 2, hasAlpha: true } } as unknown as AssetExport,
      ),
    ).toBe(false);
  });
  it('detects renames, moves and alt changes, treating missing and empty alike', () => {
    expect(isAssetChanged(file as unknown as Asset, { ...file, id: 'a', name: 'logo2' } as unknown as AssetExport)).toBe(true);
    expect(isAssetChanged(file as unknown as Asset, { ...file, id: 'a', parentPath: 'f' } as unknown as AssetExport)).toBe(true);
    expect(isAssetChanged(file as unknown as Asset, { ...file, id: 'a', alt: 'Logo' } as unknown as AssetExport)).toBe(true);
  });
});

describe('isTranslationChanged', () => {
  const tr = { type: 'STRING', locales: { en: 'Hi', de: 'Hallo' }, labels: ['a', 'b'] };
  it('compares locale maps regardless of key order, and labels as sets', () => {
    expect(isLocalesEqual({ en: 'Hi', de: 'Hallo' }, { de: 'Hallo', en: 'Hi' })).toBe(true);
    expect(
      isTranslationChanged(
        tr as unknown as Translation,
        { id: 't', type: 'STRING', locales: { de: 'Hallo', en: 'Hi' }, labels: ['b', 'a'] } as unknown as TranslationExport,
      ),
    ).toBe(false);
    expect(
      isTranslationChanged(
        tr as unknown as Translation,
        { id: 't', type: 'STRING', locales: { en: 'Hi' }, labels: ['a', 'b'] } as unknown as TranslationExport,
      ),
    ).toBe(true);
  });
});
