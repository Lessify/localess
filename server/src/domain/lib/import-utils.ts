/**
 * Returns true if two optional string arrays contain the same elements (order-insensitive).
 * Both undefined and empty-array are treated as equivalent.
 * @param {string[] | undefined} a - first labels array
 * @param {string[] | undefined} b - second labels array
 * @return {boolean} true if both arrays contain the same elements
 */
export function isLabelsEqual(a?: string[], b?: string[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return [...a].sort().join(',') === [...b].sort().join(',');
}
