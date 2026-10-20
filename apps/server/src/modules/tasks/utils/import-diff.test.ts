import { Translation } from '@localess/shared';
import { describe, expect, it } from 'vitest';

import { isLocalesEqual, isTranslationChanged } from './import-diff.js';

describe('isTranslationChanged', () => {
  const tr = { locales: { en: 'Hi', de: 'Hallo' }, labels: ['a', 'b'] };
  it('compares locale maps regardless of key order, and labels as sets', () => {
    expect(isLocalesEqual({ en: 'Hi', de: 'Hallo' }, { de: 'Hallo', en: 'Hi' })).toBe(true);
    expect(isTranslationChanged(tr as unknown as Translation, { id: 't', locales: { de: 'Hallo', en: 'Hi' }, labels: ['b', 'a'] })).toBe(
      false,
    );
    expect(isTranslationChanged(tr as unknown as Translation, { id: 't', locales: { en: 'Hi' }, labels: ['a', 'b'] })).toBe(true);
  });
});
