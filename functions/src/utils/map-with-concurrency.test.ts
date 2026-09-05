import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './map-with-concurrency';

/** Resolves after a tick, tracking peak concurrency in the supplied counter. */
function tracked(counter: { active: number; peak: number }) {
  return async (n: number) => {
    counter.active++;
    counter.peak = Math.max(counter.peak, counter.active);
    await new Promise(resolve => setTimeout(resolve, 1));
    counter.active--;
    return n * 2;
  };
}

describe('mapWithConcurrency', () => {
  it('returns an empty array for empty input', async () => {
    expect(await mapWithConcurrency([], 5, async n => n)).toEqual([]);
  });

  it('preserves input order regardless of completion order', async () => {
    const delays = [30, 1, 20, 2, 10];
    const result = await mapWithConcurrency(delays, 5, async ms => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    });
    expect(result).toEqual(delays);
  });

  it('never runs more than `limit` tasks at once', async () => {
    const counter = { active: 0, peak: 0 };
    const items = Array.from({ length: 50 }, (_, i) => i);
    await mapWithConcurrency(items, 10, tracked(counter));
    expect(counter.peak).toBeLessThanOrEqual(10);
    expect(counter.peak).toBeGreaterThan(1);
  });

  it('runs sequentially when the limit is 1', async () => {
    const counter = { active: 0, peak: 0 };
    await mapWithConcurrency([1, 2, 3, 4], 1, tracked(counter));
    expect(counter.peak).toBe(1);
  });

  it('processes every item when the limit exceeds the input length', async () => {
    const result = await mapWithConcurrency([1, 2, 3], 100, async n => n * 2);
    expect(result).toEqual([2, 4, 6]);
  });

  it('passes the index to the mapper', async () => {
    const result = await mapWithConcurrency(['a', 'b', 'c'], 2, async (value, index) => `${index}:${value}`);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });

  it('rejects when the mapper rejects', async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async n => {
        if (n === 2) throw new Error('boom');
        return n;
      })
    ).rejects.toThrow('boom');
  });

  it('treats a limit below 1 as 1 rather than stalling', async () => {
    const result = await mapWithConcurrency([1, 2], 0, async n => n);
    expect(result).toEqual([1, 2]);
  });
});
