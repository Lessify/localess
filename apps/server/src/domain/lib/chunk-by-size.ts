/** Sendable chunks, plus the items that cannot be sent at any batch size. */
export interface ChunkBySizeResult<T> {
  chunks: T[][];
  oversized: T[];
}

/**
 * Split items into chunks whose summed size stays within a limit.
 *
 * Translation providers cap a request by total content size rather than item count, so
 * batching has to measure. An item larger than the limit cannot be sent at all and is
 * returned separately instead of being dropped or silently truncated.
 * @param {Array} items values to split, order preserved
 * @param {number} limit maximum summed size of one chunk, inclusive
 * @param {Function} size measures one item
 * @return {ChunkBySizeResult} sendable chunks, and items too large to send
 */
export function chunkBySize<T>(items: readonly T[], limit: number, size: (item: T) => number): ChunkBySizeResult<T> {
  const chunks: T[][] = [];
  const oversized: T[] = [];
  let current: T[] = [];
  let currentSize = 0;

  for (const item of items) {
    const itemSize = size(item);
    if (itemSize > limit) {
      oversized.push(item);
      continue;
    }
    if (current.length > 0 && currentSize + itemSize > limit) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(item);
    currentSize += itemSize;
  }
  if (current.length > 0) chunks.push(current);

  return { chunks, oversized };
}
