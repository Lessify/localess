import { describe, expect, it } from 'vitest';
import { MAX_PER_PAGE, normalizePaging } from './unsplash-paging.js';

describe('normalizePaging', () => {
  it('keeps valid values', () => {
    expect(normalizePaging(2, 10)).toEqual({ page: 2, perPage: 10 });
  });

  it('caps the page size at the Unsplash maximum', () => {
    expect(normalizePaging(1, 10_000).perPage).toBe(MAX_PER_PAGE);
  });

  it('falls back to defaults for missing or invalid values', () => {
    expect(normalizePaging(undefined, undefined)).toEqual({ page: undefined, perPage: 20 });
    expect(normalizePaging(0, -5)).toEqual({ page: undefined, perPage: 20 });
    expect(normalizePaging('abc', 'xyz')).toEqual({ page: undefined, perPage: 20 });
  });

  it('floors fractional values', () => {
    expect(normalizePaging(2.7, 5.9)).toEqual({ page: 2, perPage: 5 });
  });
});
