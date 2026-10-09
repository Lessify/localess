const REDACTED = '[REDACTED]';

const SECRET_QUERY_KEYS = new Set(['token', 'apikey', 'api_key', 'api-key', 'secret', 'password']);

/**
 * Serialize a request query object for logging with secret values masked.
 *
 * API tokens are passed to the public V1 API as the `token` query param, so logging a raw
 * query object persists a usable credential into Cloud Logging for its whole retention period.
 * Every log statement that includes a query object must go through this function.
 *
 * @param {unknown} query Express `req.query` (or any plain object)
 * @return {string} JSON string with the value of every known secret key replaced
 */
export function redactQuery(query: unknown): string {
  if (query === null || typeof query !== 'object') {
    return '{}';
  }
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    redacted[key] = SECRET_QUERY_KEYS.has(key.toLowerCase()) ? REDACTED : value;
  }
  return JSON.stringify(redacted);
}
