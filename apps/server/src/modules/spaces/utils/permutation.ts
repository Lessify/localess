/** `ids` lists each of `current` once, in any order. */
export function isPermutation(ids: string[], current: string[]): boolean {
  const known = new Set(current);
  return ids.length === known.size && new Set(ids).size === ids.length && ids.every(id => known.has(id));
}
