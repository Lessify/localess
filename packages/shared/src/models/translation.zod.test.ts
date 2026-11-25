import { describe, expect, it } from 'vitest';

import { isTranslationKey, TRANSLATION_VALUE_MAX_LENGTH } from './translation.model.js';
import { zTranslationFile, zTranslationFlatFile, zTranslationPush, zTranslationValue } from './translation.zod.js';

describe('zTranslationPush', () => {
  it.each(['add-missing', 'update-existing', 'delete-missing-key', 'delete-missing-value'])('accepts %s', type => {
    expect(zTranslationPush.safeParse({ type, values: {} }).success).toBe(true);
  });

  // Split into delete-missing-key (every locale) and delete-missing-value (this locale only), so a
  // caller always states the scope; the ambiguous name is gone rather than aliased.
  it('rejects the former delete-missing', () => {
    expect(zTranslationPush.safeParse({ type: 'delete-missing', values: {} }).success).toBe(false);
  });
});

describe('isTranslationKey', () => {
  it.each(['nav.home', 'a1', 'Btn_ok-label.v2', 'x'.repeat(150)])('accepts %s', key => {
    expect(isTranslationKey(key)).toBe(true);
  });

  it.each(['', 'a', 'has space', 'trailing.', '1st', '.dot', 'line\nbreak', 'ünicode', 'x'.repeat(151)])('refuses %j', key => {
    expect(isTranslationKey(key)).toBe(false);
  });
});

describe('zTranslationValue', () => {
  it('accepts up to the limit and refuses longer values', () => {
    expect(zTranslationValue.safeParse('x'.repeat(TRANSLATION_VALUE_MAX_LENGTH)).success).toBe(true);
    expect(zTranslationValue.safeParse('x'.repeat(TRANSLATION_VALUE_MAX_LENGTH + 1)).success).toBe(false);
  });

  it('is the limit of every value in import files and the CLI push', () => {
    const long = 'x'.repeat(TRANSLATION_VALUE_MAX_LENGTH + 1);
    expect(zTranslationFile.safeParse([{ id: 'k', locales: { en: long } }]).success).toBe(false);
    expect(zTranslationFlatFile.safeParse({ k: long }).success).toBe(false);
    expect(zTranslationPush.safeParse({ type: 'add-missing', values: { k: long } }).success).toBe(false);
  });
});

describe('zTranslationFile', () => {
  it('reads files exported with a type, which is ignored', () => {
    const parsed = zTranslationFile.parse([{ id: 'k', type: 'STRING', locales: { en: 'v' } }]);
    expect(parsed).toEqual([{ id: 'k', locales: { en: 'v' } }]);
  });
});
