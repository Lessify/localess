import { describe, expect, it } from 'vitest';

import { zAssetCountQuery, zAssetFolderCreate, zAssetMove, zAssetUpdate, zAssetUpload } from './asset.zod.js';

const id = '01890000-0000-7000-8000-000000000000';

describe('asset requests', () => {
  it('refuse an unknown field on every body and in the upload fields', () => {
    expect(zAssetFolderCreate.safeParse({ name: 'Images', kind: 'FOLDER' }).success).toBe(false);
    expect(zAssetUpdate.safeParse({ name: 'Logo', parentId: id }).success).toBe(false);
    expect(zAssetMove.safeParse({ parentId: id, name: 'Logo' }).success).toBe(false);
    expect(zAssetUpload.safeParse({ parentId: '', folder: 'x' }).success).toBe(false);
  });

  it('take what the editor sends', () => {
    expect(zAssetFolderCreate.safeParse({ name: 'Images' }).success).toBe(true);
    expect(zAssetUpdate.safeParse({ name: 'Logo', alt: '' }).success).toBe(true);
    expect(zAssetMove.safeParse({ parentId: null }).success).toBe(true);
    expect(zAssetUpload.safeParse({ parentId: '', name: 'Logo', extension: '.png', alt: 'A', source: 'S' }).success).toBe(true);
  });

  it('count every asset or one kind, and refuse an unknown kind', () => {
    expect(zAssetCountQuery.parse({})).toEqual({});
    expect(zAssetCountQuery.parse({ kind: 'FILE' })).toEqual({ kind: 'FILE' });
    expect(zAssetCountQuery.safeParse({ kind: 'DOCUMENT' }).success).toBe(false);
  });
});
