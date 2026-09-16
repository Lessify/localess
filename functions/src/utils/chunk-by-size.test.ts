import { describe, expect, it } from 'vitest';
import { chunkBySize } from './chunk-by-size';

const len = (s: string) => s.length;

describe('chunkBySize', () => {
  it('keeps items in one chunk while they fit', () => {
    const { chunks, oversized } = chunkBySize(['aaa', 'bbb'], 10, len);
    expect(chunks).toEqual([['aaa', 'bbb']]);
    expect(oversized).toEqual([]);
  });

  it('starts a new chunk when the next item would exceed the limit', () => {
    const { chunks } = chunkBySize(['aaaa', 'bbbb', 'cc'], 8, len);
    expect(chunks).toEqual([['aaaa', 'bbbb'], ['cc']]);
  });

  it('separates items that exceed the limit on their own', () => {
    const { chunks, oversized } = chunkBySize(['ok', 'x'.repeat(20)], 10, len);
    expect(chunks).toEqual([['ok']]);
    expect(oversized).toEqual(['x'.repeat(20)]);
  });

  it('preserves input order across chunks', () => {
    const { chunks } = chunkBySize(['a', 'b', 'c', 'd'], 2, len);
    expect(chunks.flat()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns no chunks for no items', () => {
    expect(chunkBySize([], 10, len)).toEqual({ chunks: [], oversized: [] });
  });

  // An item exactly at the limit is sendable; the limit is inclusive.
  it('treats an item exactly at the limit as sendable', () => {
    const { chunks, oversized } = chunkBySize(['x'.repeat(10)], 10, len);
    expect(chunks).toEqual([['x'.repeat(10)]]);
    expect(oversized).toEqual([]);
  });
});
