import { describe, expect, it } from 'vitest';

import { assetFieldFileType, AssetFileType, SchemaFieldKind } from './schema.model.js';

describe('assetFieldFileType', () => {
  it('reads fileType, what the schema editor saves', () => {
    expect(assetFieldFileType({ name: 'image', kind: SchemaFieldKind.ASSET, fileType: AssetFileType.IMAGE })).toBe(AssetFileType.IMAGE);
  });

  it('falls back to the first of fileTypes (older schemas, the space templates)', () => {
    expect(assetFieldFileType({ name: 'files', kind: SchemaFieldKind.ASSETS, fileTypes: [AssetFileType.VIDEO, AssetFileType.AUDIO] })).toBe(
      AssetFileType.VIDEO,
    );
  });

  it('prefers fileType when both are set (the editor rewrites fileTypes as fileType)', () => {
    expect(
      assetFieldFileType({ name: 'image', kind: SchemaFieldKind.ASSET, fileType: AssetFileType.TEXT, fileTypes: [AssetFileType.IMAGE] }),
    ).toBe(AssetFileType.TEXT);
  });

  it('is ANY when neither is set', () => {
    expect(assetFieldFileType({ name: 'image', kind: SchemaFieldKind.ASSET })).toBe(AssetFileType.ANY);
  });
});
