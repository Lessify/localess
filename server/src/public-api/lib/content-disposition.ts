/** Placeholder used when a filename has no ASCII characters worth keeping. */
const FALLBACK_FILENAME = 'file';

/**
 * Reduces a filename to something safe inside a quoted `filename="…"` parameter.
 *
 * Quotes and backslashes would terminate or escape the quoted string, and CR/LF would let a
 * crafted asset name inject a header. Non-ASCII is dropped here rather than percent-encoded:
 * this parameter is the *fallback* for clients that ignore `filename*`, and a fallback full of
 * `%D1%84` escapes is worse than a shortened plain name, since those clients would take the
 * escapes literally.
 * @param {string} filename Raw filename from the asset record
 * @return {string} a filename safe to place inside double quotes
 */
function toAsciiFallback(filename: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = filename.replace(/["\\]/g, '').replace(/[\x00-\x1F\x7F]/g, '');
  const ascii = stripped.replace(/[^\x20-\x7E]/g, '').trim();

  // The stem must retain something recognisable, not just leftover punctuation: stripping
  // `фото-тест.jpg` leaves `-.jpg`, which is a legal filename but useless to the very clients
  // this fallback exists for. Anything with a letter or digit left in the stem is kept as-is.
  const stem = ascii.replace(/\.[A-Za-z0-9]+$/, '');
  if (/[A-Za-z0-9]/.test(stem)) return ascii;

  // Nothing recognisable survived — keep the extension if there is one, so the file still opens
  // in whatever the client associates with it.
  const extension = filename.match(/\.[A-Za-z0-9]+$/)?.[0] ?? '';
  return `${FALLBACK_FILENAME}${extension}`;
}

/**
 * Builds a `Content-Disposition` header value.
 *
 * Two things this gets right that the previous inline construction did not:
 *
 * 1. The disposition type for a download is **`attachment`** (RFC 6266). The previous
 *    `form-data` is a multipart-body token from RFC 7578 and only behaved correctly because
 *    browsers treat an unrecognised type as `attachment`.
 * 2. A non-ASCII name is carried in an RFC 5987 `filename*` parameter. Percent-encoding it
 *    into the plain `filename` — as `encodeURI` did — makes compliant clients save the file
 *    *named* `%D1%84%D0%BE...`, because they take that parameter literally.
 *
 * The plain `filename` is always emitted first as an ASCII fallback, which RFC 6266 §4.3
 * recommends for clients that do not understand `filename*`.
 * @param {string} filename Raw filename from the asset record
 * @param {boolean} download Whether the response should be saved rather than displayed
 * @return {string} a complete Content-Disposition header value
 */
export function buildContentDisposition(filename: string, download: boolean): string {
  const type = download ? 'attachment' : 'inline';
  const fallback = toAsciiFallback(filename);
  const header = `${type}; filename="${fallback}"`;

  // Only worth the extended parameter when it would actually carry more than the fallback.
  // eslint-disable-next-line no-control-regex
  const needsExtended = /[^\x20-\x7E]/.test(filename) || /["\\]/.test(filename) || /[\x00-\x1F\x7F]/.test(filename);
  if (!needsExtended) return header;

  // `encodeURIComponent` leaves `!'()*` unescaped, none of which are valid in an RFC 5987
  // `attr-char`, so they are escaped explicitly.
  const encoded = encodeURIComponent(filename).replace(/['()!*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${header}; filename*=UTF-8''${encoded}`;
}
