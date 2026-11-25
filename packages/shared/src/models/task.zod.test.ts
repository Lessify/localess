import { describe, expect, it } from 'vitest';

import { taskKindsFor } from './task.model.js';
import { zTaskCreate, zTaskImportCreate } from './task.zod.js';

describe('task requests', () => {
  it('refuses the retired content and asset kinds', () => {
    expect(zTaskCreate.safeParse({ kind: 'CONTENT_EXPORT' }).success).toBe(false);
    expect(zTaskCreate.safeParse({ kind: 'ASSET_EXPORT' }).success).toBe(false);
    expect(zTaskImportCreate.safeParse({ kind: 'ASSET_IMPORT' }).success).toBe(false);
  });

  it('a translation export takes no locale (the key-value export is a direct download)', () => {
    expect(zTaskCreate.safeParse({ kind: 'TRANSLATION_EXPORT', locale: 'de' }).success).toBe(false);
    expect(zTaskCreate.safeParse({ kind: 'TRANSLATION_EXPORT' }).success).toBe(true);
  });

  it('a translate-locale task carries its params, typed, overwrite defaulting to false', () => {
    const params = { type: 'translation-translate', sourceLocale: 'en', targetLocale: 'de' };
    expect(zTaskCreate.parse({ kind: 'TRANSLATION_TRANSLATE', params })).toEqual({
      kind: 'TRANSLATION_TRANSLATE',
      params: { ...params, overwrite: false },
    });
    expect(zTaskCreate.safeParse({ kind: 'TRANSLATION_TRANSLATE', params: { sourceLocale: 'en', targetLocale: 'de' } }).success).toBe(
      false,
    );
    expect(zTaskCreate.safeParse({ kind: 'TRANSLATION_TRANSLATE', params: { ...params, type: 'translation-full' } }).success).toBe(false);
  });

  it('a translation import names its type: translation-full, or translation-json-flat with its locale', () => {
    const ok = (fields: object) => zTaskImportCreate.safeParse(fields).success;
    expect(ok({ kind: 'TRANSLATION_IMPORT', type: 'translation-full' })).toBe(true);
    expect(ok({ kind: 'TRANSLATION_IMPORT', type: 'translation-json-flat', locale: 'de' })).toBe(true);
    expect(ok({ kind: 'SCHEMA_IMPORT' })).toBe(true);
    expect(ok({ kind: 'TRANSLATION_IMPORT' })).toBe(false);
    expect(ok({ kind: 'TRANSLATION_IMPORT', type: 'translation-json-flat' })).toBe(false);
    expect(ok({ kind: 'TRANSLATION_IMPORT', type: 'translation-full', locale: 'de' })).toBe(false);
    expect(ok({ kind: 'TRANSLATION_IMPORT', type: 'translation-translate' })).toBe(false);
    expect(ok({ kind: 'TRANSLATION_IMPORT', format: 'full' })).toBe(false);
    expect(ok({ kind: 'SCHEMA_IMPORT', type: 'translation-full' })).toBe(false);
    expect(ok({ kind: 'SCHEMA_IMPORT', locale: 'de' })).toBe(false);
  });
});

describe('task kinds by role', () => {
  it('each role may start its kinds', () => {
    expect(taskKindsFor({ role: 'TRANSLATOR' })).toEqual(['TRANSLATION_TRANSLATE']);
    expect(taskKindsFor({ role: 'EDITOR' })).toEqual(['TRANSLATION_EXPORT', 'TRANSLATION_IMPORT', 'TRANSLATION_TRANSLATE']);
    expect(taskKindsFor({ role: 'ADMIN' })).toHaveLength(6);
    expect(taskKindsFor({ role: 'VIEWER' })).toEqual([]);
  });
});
