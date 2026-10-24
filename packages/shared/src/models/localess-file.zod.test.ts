import { describe, expect, it } from 'vitest';

import { zLocalessManifest, zSchemaLine, zTranslationLine } from './localess-file.zod.js';

describe('the .localess.zip file', () => {
  const manifest = {
    format: 'localess',
    version: 1,
    kind: 'SCHEMA',
    exportedAt: '2026-10-23T00:00:00.000Z',
    source: { spaceId: 'x', spaceName: 'X', locales: ['en'] },
    count: 2,
  };

  it('reads a manifest and refuses another format or version', () => {
    expect(zLocalessManifest.parse(manifest)).toEqual(manifest);
    expect(zLocalessManifest.safeParse({ ...manifest, format: 'other' }).success).toBe(false);
    expect(zLocalessManifest.safeParse({ ...manifest, version: 2 }).success).toBe(false);
  });

  it('a translation line has a key and locales', () => {
    expect(zTranslationLine.safeParse({ key: 'a.b', locales: { en: 'A' }, labels: ['ui'] }).success).toBe(true);
    expect(zTranslationLine.safeParse({ id: 'a.b', locales: {} }).success).toBe(false);
  });

  it('a schema line is identified by its name, not an id', () => {
    expect(zSchemaLine.safeParse({ name: 'page', type: 'ROOT', fields: [] }).success).toBe(true);
    expect(zSchemaLine.safeParse({ id: 'page', type: 'ROOT' }).success).toBe(false);
  });
});
