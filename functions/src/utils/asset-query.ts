import { AssetTransformQuery } from './image-transform';

/**
 * Serialises transform parameters back into a query string.
 *
 * Used to build the target of a canonical redirect, so the output has to be *the* canonical
 * spelling rather than merely a valid one — otherwise the redirect would point at yet another
 * URL for the same bytes, which is the duplication it exists to remove.
 *
 * That means two things. Parameters are emitted in a fixed order (`w`, `h`, `q`, `f`, `fit`,
 * then the flags), so a caller's ordering does not leak into the target. And `download` and
 * `thumbnail` are emitted **valueless** — `?download`, not `?download=true` — matching both
 * the form the Localess UI links to and `buildAssetQueryString` in `@localess/client`.
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
  if (query.qualityExplicit) parts.push(`q=${query.quality}`);
  if (query.format !== undefined) parts.push(`f=${query.format}`);
  if (query.fit !== undefined) parts.push(`fit=${query.fit}`);
  if (query.download) parts.push('download');
  if (query.thumbnail) parts.push('thumbnail');
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}
