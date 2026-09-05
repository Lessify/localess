import { describe, expect, it } from 'vitest';
import { stripStorageIds } from './strip-storage-ids';

describe('stripStorageIds', () => {
  it('removes assets, links and references', () => {
    const result = stripStorageIds({
      id: 'author-1',
      name: 'Jane',
      assets: ['asset-1'],
      links: ['content-2'],
      references: ['org-9'],
    });
    expect('assets' in result).toBe(false);
    expect('links' in result).toBe(false);
    expect('references' in result).toBe(false);
  });

  it('keeps every other field, including new ones it does not know about', () => {
    const result = stripStorageIds({
      id: 'author-1',
      name: 'Jane',
      locale: 'en',
      data: { _id: 'author-1', schema: 'Author' },
      somethingAddedLater: 42,
      references: ['org-9'],
    });
    expect(result).toEqual({
      id: 'author-1',
      name: 'Jane',
      locale: 'en',
      data: { _id: 'author-1', schema: 'Author' },
      somethingAddedLater: 42,
    });
  });

  it('is a no-op when the fields are absent', () => {
    const result = stripStorageIds({ id: 'author-1', name: 'Jane' });
    expect(result).toEqual({ id: 'author-1', name: 'Jane' });
  });

  it('does not mutate the input', () => {
    const stored = { id: 'a', references: ['org-9'] };
    stripStorageIds(stored);
    expect(stored.references).toEqual(['org-9']);
  });

  it('strips the keys even when their values are empty', () => {
    const result = stripStorageIds({ id: 'a', assets: [], links: [], references: [] });
    expect(Object.keys(result)).toEqual(['id']);
  });
});
