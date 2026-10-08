/**
 * Shape every Localess ID has: Firestore auto-IDs are 20 alphanumerics; `_` and `-` are allowed for
 * headroom. Anything else — above all `/`, which Express decodes from `%2F` in route params — is
 * refused, because these IDs are spliced into Firestore and Storage paths. `X%2Fdraft` as a content
 * ID would otherwise resolve to the unpublished draft file under a public token.
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
