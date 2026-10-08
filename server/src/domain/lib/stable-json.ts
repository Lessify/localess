/**
 * Deterministic JSON serialization: object keys sorted recursively, array order preserved.
 * Used for change detection so semantically identical schemas compare equal
 * regardless of the key order the client serialized them with.
 * @param {unknown} value value to serialize
 * @return {string} stable JSON string
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

/**
 * Recursively sort object keys.
 * @param {unknown} value value to normalize
 * @return {unknown} normalized value
 */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      out[key] = sortKeysDeep(record[key]);
    }
    return out;
  }
  return value;
}
