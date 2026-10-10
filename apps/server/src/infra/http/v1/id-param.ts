/**
 * Shape of every id a request may carry: a UUID (ids are UUIDv7s), or a Firestore id (20 alphanumerics, `_` and `-`
 * allowed for headroom) that public URLs and imported content still use. Anything else — above all `/`, which is
 * decoded from `%2F` in route params — is refused, because ids end up in storage keys. In the Firebase era
 * `X%2Fdraft` as a content id resolved to the unpublished draft file under a public token.
 */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * @param {unknown} value route parameter or other ID taken from a request
 * @return {boolean} true when `value` is a well-formed ID
 */
export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

/**
 * Throws when `id` cannot be used as a single path segment. Guards path builders against IDs that
 * reach them from stored data (for example reference IDs inside content JSON) rather than a route.
 *
 * @param {string} id ID about to be placed in a path
 * @param {string} name what the ID is, for the error message
 */
export function assertPathSegment(id: string, name: string): void {
  if (!isValidId(id)) {
    throw new Error(`Invalid ${name} '${id}'`);
  }
}
