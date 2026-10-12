import { describe, expect, it } from 'vitest';
import { Translation, TranslationExport } from '@localess/shared';
import { isLocalesEqual, isTranslationChanged } from './import-diff.js';

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
