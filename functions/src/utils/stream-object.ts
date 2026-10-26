import type { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import type { Readable } from 'stream';

/**
 * Largest object this API will serve. Known issue: Firebase Hosting buffers a rewritten function
 * response and cuts it off at 32 MiB while still answering `200` with a matching
 * `Content-Length`, so a larger asset would arrive silently truncated — and a client such as the
 * self-hosted import would store the broken copy as if it were complete. Anything bigger is
 * refused outright instead (see docs/v1-functions-api.md, "Known limitations"). Kept a little
 * under the limit to leave room for the headers.
 */
export const MAX_SERVED_BYTES = 31 * 1024 * 1024;

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
export interface StreamableFile {
  createReadStream(options?: { start?: number; end?: number; validation?: false }): Readable;
}

/**
 * Streams a stored object to the response, honouring a single `Range`. Headers other than
 * length and range (type, disposition, cache) must already be set by the caller.
 *
 * Replaces `download()` to `/tmp` + `sendFile`, which held the whole object in memory: `/tmp` is
 * RAM on Cloud Functions. Objects above {@link MAX_SERVED_BYTES} are refused with `413`.
 * @param {Request} req Incoming request, read for `Range` and the method
 * @param {Response} res Response to stream into
 * @param {StreamableFile} file Storage object to read
 * @param {number} size Object size in bytes, from its metadata
 * @param {string} tag Log prefix of the calling route
 */
export function streamStoredObject(req: Request, res: Response, file: StreamableFile, size: number, tag: string): void {
  if (size > MAX_SERVED_BYTES) {
    // Refused with an explicit status rather than streamed: Hosting would truncate the body and
    // still report success. Uncached, so lifting the limit later takes effect immediately.
    logger.warn(`${tag} refused a ${size}-byte object: above the ${MAX_SERVED_BYTES}-byte limit Hosting can serve`);
    res.removeHeader('Content-Disposition');
    res
      .status(413)
      .header('Cache-Control', 'no-cache')
      .contentType('text/plain')
      .send(
        `This asset is ${size} bytes, above the ${MAX_SERVED_BYTES}-byte limit the API can serve through Firebase Hosting. ` +
          'Known issue: see "Known limitations" in docs/v1-functions-api.md.'
      );
    return;
  }
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
