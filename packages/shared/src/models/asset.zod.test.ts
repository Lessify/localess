import { describe, expect, it } from 'vitest';

import { zAssetCountQuery, zAssetFolderCreate, zAssetPageable, zAssetUpdate, zAssetUpload } from './asset.zod.js';

const id = '01890000-0000-7000-8000-000000000000';

describe('asset requests', () => {
  it('refuse an unknown field on every body and in the upload fields', () => {
    expect(zAssetFolderCreate.safeParse({ name: 'Images', kind: 'FOLDER' }).success).toBe(false);
    expect(zAssetUpdate.safeParse({ name: 'Logo', slug: 'logo' }).success).toBe(false);
    expect(zAssetUpdate.safeParse({ parentId: 'not-a-uuid' }).success).toBe(false);
    expect(zAssetUpload.safeParse({ parentId: '', folder: 'x' }).success).toBe(false);
  });

  it('take what the editor sends', () => {
    expect(zAssetFolderCreate.safeParse({ name: 'Images' }).success).toBe(true);
    expect(zAssetUpdate.safeParse({ name: 'Logo', alt: '' }).success).toBe(true);
    expect(zAssetUpdate.safeParse({ name: 'Logo', parentId: null }).success).toBe(true);
    expect(zAssetUpdate.safeParse({ parentId: id }).success).toBe(true);
    expect(zAssetUpload.safeParse({ parentId: '', name: 'Logo', extension: '.png', alt: 'A', source: 'S' }).success).toBe(true);
  });

  it('count every asset or one kind, and refuse an unknown kind', () => {
    expect(zAssetCountQuery.parse({})).toEqual({});
    expect(zAssetCountQuery.parse({ kind: 'FILE' })).toEqual({ kind: 'FILE' });
    expect(zAssetCountQuery.safeParse({ kind: 'DOCUMENT' }).success).toBe(false);
  });
});

describe('zAssetPageable', () => {
  it('defaults to the root, by name, 20 a page', () => {
    expect(zAssetPageable.parse({})).toEqual({ page: 0, size: 20, sort: 'name', direction: 'asc', deep: false });
  });

  it('reads the folder, the scope, the kind, the file type, and the search; ids are no longer read', () => {
    expect(zAssetPageable.parse({ parentId: id, deep: 'true', kind: 'FILE', fileType: 'IMAGE', search: ' sun ', ids: id })).toEqual({
      page: 0,
      size: 20,
      sort: 'name',
      direction: 'asc',
      parentId: id,
      deep: true,
      kind: 'FILE',
      fileType: 'IMAGE',
      search: 'sun',
    });
  });

  it('refuses what it can not read', () => {
    for (const query of [{ sort: 'extension' }, { kind: 'DOCUMENT' }, { parentId: '' }, { fileType: 'image' }, { deep: 'yes' }]) {
      expect(zAssetPageable.safeParse(query).success, JSON.stringify(query)).toBe(false);
    }
  });
});
