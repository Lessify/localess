/**
 * Map over items with a bounded number of concurrent tasks.
 *
 * A drop-in replacement for `Promise.all(items.map(fn))` where `items` is
 * caller-controlled and each task costs a network round-trip. Results keep input order;
 * the first rejection rejects the whole call, matching `Promise.all`.
 *
 * @param {Array} items values to map over
 * @param {number} limit maximum tasks in flight; values below 1 are treated as 1
 * @param {Function} fn mapper receiving the item and its index
 * @return {Promise} results in input order
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const effectiveLimit = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  let next = 0;

  const workers = Array.from({ length: effectiveLimit }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}
