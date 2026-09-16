import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslateItem } from '../models';
import { translateItems, TRANSLATE_CHUNK_LIMIT } from './translate-batch';

const translateCloudBatch = vi.hoisted(() => vi.fn());
vi.mock('../services/translate.service', () => ({ translateCloudBatch, translateCloud: vi.fn(), translateWithGoogle: vi.fn() }));

describe('translateItems', () => {
  // Block body, not a concise arrow: `mockReset()` returns the mock, and Vitest treats a function
  // returned from a hook as a teardown callback - which would invoke the mock with no arguments
  // after every test.
  beforeEach(() => {
    translateCloudBatch.mockReset();
  });

  it('groups items by format so each format is one provider call', async () => {
    translateCloudBatch.mockImplementation(async (contents: string[]) => contents.map(c => `T:${c}`));
    const items: TranslateItem[] = [
      { id: 'a', content: 'one', format: 'text' },
      { id: 'b', content: '<p>two</p>', format: 'html' },
      { id: 'c', content: 'three' },
    ];

    const result = await translateItems(items, 'en', 'de');

    expect(translateCloudBatch).toHaveBeenCalledTimes(2);
    expect(result.items).toEqual([
      { id: 'a', content: 'T:one' },
      { id: 'c', content: 'T:three' },
      { id: 'b', content: 'T:<p>two</p>' },
    ]);
    expect(result.failed).toEqual([]);
  });

  it('reports an item larger than the chunk limit as failed instead of sending it', async () => {
    translateCloudBatch.mockImplementation(async (contents: string[]) => contents.map(c => `T:${c}`));
    const huge = 'x'.repeat(TRANSLATE_CHUNK_LIMIT + 1);

    const result = await translateItems(
      [
        { id: 'big', content: huge },
        { id: 'ok', content: 'fine' },
      ],
      'en',
      'de'
    );

    expect(result.items).toEqual([{ id: 'ok', content: 'T:fine' }]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].id).toBe('big');
    expect(result.failed[0].reason).toContain('too large');
  });

  it('keeps other chunks when one provider call fails', async () => {
    translateCloudBatch
      .mockRejectedValueOnce(new Error('provider exploded'))
      .mockImplementation(async (contents: string[]) => contents.map(c => `T:${c}`));

    const result = await translateItems(
      [
        { id: 'a', content: 'one', format: 'text' },
        { id: 'b', content: '<p>two</p>', format: 'html' },
      ],
      'en',
      'de'
    );

    expect(result.items).toEqual([{ id: 'b', content: 'T:<p>two</p>' }]);
    expect(result.failed).toEqual([{ id: 'a', reason: 'provider exploded' }]);
  });

  it('returns nothing for no items without calling the provider', async () => {
    const result = await translateItems([], 'en', 'de');
    expect(result).toEqual({ items: [], failed: [] });
    expect(translateCloudBatch).not.toHaveBeenCalled();
  });
});
