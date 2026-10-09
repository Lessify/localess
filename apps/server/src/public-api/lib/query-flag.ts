/**
 * Returns true when a boolean-style query param is present in any form.
 *
 * The public API's boolean params are **presence flags**, deliberately: `?download`,
 * `?download=true` and `?download=false` all enable the behaviour. A valueless flag is the
 * canonical form and is what the Localess UI itself links to, so it must never stop working.
 *
 * Callers must not test a raw query value for truthiness — both Express 5 query parsers turn a
 * bare `?flag` into the empty string, which is falsy, so a bare flag would be silently ignored.
 * That is exactly the bug that made `?thumbnail` a no-op.
 *
 * @param {unknown} value a raw value taken from `req.query`
 * @return {boolean} true when the param was present in the query string
 */
export function isFlagSet(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined;
}
