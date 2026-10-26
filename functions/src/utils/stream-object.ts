import type { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import type { Readable } from 'stream';

/**
 * Largest object served through the function; anything bigger is redirected to Storage.
 *
 * Firebase Hosting buffers a rewritten function response and cuts it off at 32 MiB — a 104 MiB
 * video arrived as its first 32 MiB with a `200` and a matching `Content-Length`, so the browser
 * reported a finished download. Chunked encoding does not help: it gets past Cloud Run's own
 * 32 MiB limit, but not past Hosting's. Kept a little under the limit to leave room for headers.
 */
export const MAX_PROXIED_BYTES = 31 * 1024 * 1024;

/**
 * How long a signed Storage URL stays valid. Long enough that a video player can still seek
 * (each seek is a fresh `Range` request against the signed URL) well after the page loaded.
 */
export const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

/**
 * How long the redirect itself may be cached, by the browser and by the Hosting CDN. Well under
 * the signed URL's lifetime, so a cached redirect never points at an expired signature.
 */
export const SIGNED_REDIRECT_MAX_AGE = 60 * 60;

export type ByteRange = { start: number; end: number };

/**
 * Parses a `Range` header against an object of `size` bytes.
 *
 * - `undefined`: no range to honour — serve the whole object. Covers a missing header, a unit
 *   other than `bytes`, malformed syntax and multi-range requests, all of which RFC 9110 lets a
 *   server answer with a plain `200`.
 * - `'unsatisfiable'`: well-formed but entirely outside the object — answer `416`.
 * - otherwise the inclusive byte range to send, clamped to the object.
 * @param {string | undefined} header Raw `Range` request header
 * @param {number} size Object size in bytes
 * @return {ByteRange | 'unsatisfiable' | undefined} the range to serve, if any
 */
export function parseByteRange(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return undefined;
  const [, first, last] = match;
  if (first === '' && last === '') return undefined;
  if (first === '') {
    // Suffix range: the final `last` bytes.
    const length = Number(last);
    if (length === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(first);
  const end = last === '' ? size - 1 : Math.min(Number(last), size - 1);
  if (last !== '' && Number(last) < start) return undefined;
  if (start >= size) return 'unsatisfiable';
  return { start, end };
}

/** The slice of a Storage `File` this needs, so tests can hand in a fake. */
export interface StoredFile {
  createReadStream(options?: { start?: number; end?: number; validation?: false }): Readable;
  getSignedUrl(config: {
    version: 'v4';
    action: 'read';
    expires: number;
    responseDisposition?: string;
    responseType?: string;
  }): Promise<[string]>;
}

/** The headers the stored object must be served with, wherever it is served from. */
export interface StoredObjectHeaders {
  contentType: string;
  contentDisposition: string;
}

/**
 * Serves a stored object: streamed through the function when Hosting can carry it, otherwise a
 * `302` to a short-lived signed Storage URL. The caller sets the type, disposition, cache and
 * security headers first; the redirect overrides the cache header and repeats type and
 * disposition as signed response overrides, so Storage serves the same filename.
 *
 * Signing calls the IAM Credentials `signBlob` API, so the runtime service account needs
 * `iam.serviceAccounts.signBlob` on itself (`npm run localess:check -- --fix` grants it). When
 * that is missing this answers an uncached `500` — never the truncated body Hosting would make
 * of a streamed one.
 * @param {Request} req Incoming request, read for `Range` and the method
 * @param {Response} res Response to write
 * @param {StoredFile} file Storage object to serve
 * @param {number} size Object size in bytes, from its metadata
 * @param {StoredObjectHeaders} headers Type and disposition to serve the object with
 * @param {string} tag Log prefix of the calling route
 * @return {Promise<void>} resolves once the response is handed off
 */
export async function serveStoredObject(
  req: Request,
  res: Response,
  file: StoredFile,
  size: number,
  headers: StoredObjectHeaders,
  tag: string
): Promise<void> {
  if (size <= MAX_PROXIED_BYTES) {
    streamStoredObject(req, res, file, size, tag);
    return;
  }
  let url: string;
  try {
    [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
      responseDisposition: headers.contentDisposition,
      responseType: headers.contentType,
    });
  } catch (error) {
    logger.error(`${tag} could not sign a Storage URL for a ${size}-byte object`, error);
    res.removeHeader('Content-Disposition');
    res
      .status(500)
      .header('Cache-Control', 'no-cache')
      .contentType('text/plain')
      .send(
        'This asset is too large to serve through Hosting, and the function could not sign a Storage URL for it. ' +
          'Grant the functions service account roles/iam.serviceAccountTokenCreator on itself: npm run localess:check -- --fix'
      );
    return;
  }
  logger.info(`${tag} ${size} bytes, redirecting to Storage`);
  res.removeHeader('Content-Disposition');
  res.header('Cache-Control', `public, max-age=${SIGNED_REDIRECT_MAX_AGE}, s-maxage=${SIGNED_REDIRECT_MAX_AGE}`).redirect(302, url);
}

/**
 * Streams a stored object to the response, honouring a single `Range`. Headers other than
 * length and range (type, disposition, cache) must already be set by the caller.
 *
 * Replaces `download()` to `/tmp` + `sendFile`, which held the whole object in memory: `/tmp`
 * is RAM on Cloud Functions.
 * @param {Request} req Incoming request, read for `Range` and the method
 * @param {Response} res Response to stream into
 * @param {StoredFile} file Storage object to read
 * @param {number} size Object size in bytes, from its metadata
 * @param {string} tag Log prefix of the calling route
 */
export function streamStoredObject(
  req: Request,
  res: Response,
  file: Pick<StoredFile, 'createReadStream'>,
  size: number,
  tag: string
): void {
  res.header('Accept-Ranges', 'bytes');
  const range = parseByteRange(req.headers.range, size);
  if (range === 'unsatisfiable') {
    res.status(416).header('Content-Range', `bytes */${size}`).header('Cache-Control', 'no-cache').end();
    return;
  }
  const { start, end } = range ?? { start: 0, end: size - 1 };
  const length = size === 0 ? 0 : end - start + 1;
  if (range) {
    res.status(206).header('Content-Range', `bytes ${start}-${end}/${size}`);
  }
  res.header('Content-Length', String(length));
  if (req.method === 'HEAD' || length === 0) {
    res.end();
    return;
  }
  // `validation: false` because a partial read cannot be checksummed, and a full one is
  // already covered by the ETag the caller sent.
  const stream = file.createReadStream(range ? { start, end, validation: false } : { validation: false });
  stream.on('error', error => {
    logger.error(`${tag} stream failed`, error);
    if (res.headersSent) {
      // Mid-body: the status is gone, so the only honest signal left is a truncated response.
      res.destroy(error);
    } else {
      res.status(500).removeHeader('Content-Length');
      res.removeHeader('Content-Range');
      res.removeHeader('Content-Disposition');
      res.header('Cache-Control', 'no-cache').end();
    }
  });
  // A client that disconnects should stop the Storage read rather than let it run to the end.
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}
