import { AssetTransformQuery } from './image-transform';

/**
 * Every parameter that belongs to the transform route and nowhere else.
 *
 * `download` is included because it was a transform-route parameter until v4 — a caller still
 * sending it to `/download` is carrying a habit worth surfacing, not an intent worth guessing at.
 */
const TRANSFORM_PARAMS = ['w', 'h', 'q', 'f', 'fit', 'thumbnail', 'download'] as const;

/**
 * Finds a transform parameter on a request that accepts none.
 *
 * Returns the offending name rather than a boolean so the `400` can name it, matching how
 * `parseAssetTransformQuery` reports a rejection. Parameters outside the list — `token`, most
 * importantly — are left alone.
 * @param {Record<string, unknown>} query Express request query
 * @return {string | undefined} the first transform parameter present, if any
 */
export function findTransformParam(query: Record<string, unknown>): string | undefined {
  return TRANSFORM_PARAMS.find(param => query[param] !== undefined);
}

/**
 * Serialises transform parameters back into a query string.
 *
 * Used to build the target of a canonical redirect, so the output has to be *the* canonical
 * spelling rather than merely a valid one — otherwise the redirect would point at yet another
 * URL for the same bytes, which is the duplication it exists to remove.
 *
 * That means two things. Parameters are emitted in a fixed order (`w`, `h`, `q`, `f`, `fit`,
 * then `thumbnail`), so a caller's ordering does not leak into the target. And `thumbnail` is
 * emitted **valueless** — `?thumbnail`, not `?thumbnail=true` — matching both the form the
 * Localess UI links to and `buildAssetQueryString` in `@localess/client`.
 *
 * `q` is emitted only when the caller supplied it: adding the default would turn a bare URL
 * into one carrying `q=80`, a second URL for an identical response.
 * @param {AssetTransformQuery} query Parsed transform parameters
 * @return {string} a query string including the leading `?`, or an empty string
 */
export function buildAssetQuery(query: AssetTransformQuery): string {
  const parts: string[] = [];
  if (query.width !== undefined) parts.push(`w=${query.width}`);
  if (query.height !== undefined) parts.push(`h=${query.height}`);
  if (query.quality !== undefined) parts.push(`q=${query.quality}`);
  if (query.format !== undefined) parts.push(`f=${query.format}`);
  if (query.fit !== undefined) parts.push(`fit=${query.fit}`);
  if (query.thumbnail) parts.push('thumbnail');
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
