import { describe, expect, it } from 'vitest';

import { isLocalesEqual, isTranslationChanged } from './import-diff.js';

describe('isTranslationChanged', () => {
  const tr = { locales: { en: 'Hi', de: 'Hallo' }, labels: ['a', 'b'], description: null };
  it('compares locale maps regardless of key order, and labels as sets', () => {
    expect(isLocalesEqual({ en: 'Hi', de: 'Hallo' }, { de: 'Hallo', en: 'Hi' })).toBe(true);
    expect(isTranslationChanged(tr, { locales: { de: 'Hallo', en: 'Hi' }, labels: ['b', 'a'] })).toBe(false);
    expect(isTranslationChanged(tr, { locales: { en: 'Hi' }, labels: ['a', 'b'] })).toBe(true);
  });
  it('takes an empty description or no labels as none', () => {
    expect(isTranslationChanged({ locales: {}, description: '', labels: [] }, { locales: {} })).toBe(false);
  });
});
