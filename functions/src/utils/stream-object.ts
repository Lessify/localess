import type { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import type { Readable } from 'stream';

/**
 * Cloud Run rejects a response larger than 32 MiB with a bare `500` unless it is streamed with
 * chunked transfer encoding — and a response carrying `Content-Length` is not streamed in that
 * sense. Bodies at or under this size keep their `Content-Length` (so clients show progress);
 * anything larger is sent without one, which is what makes Node fall back to chunked encoding.
 * Kept a little under the hard limit to leave room for the headers.
 */
export const MAX_CONTENT_LENGTH_BYTES = 31 * 1024 * 1024;

export type ByteRange = { start: number; end: number };

/**
 * Parses a `Range` header against an object of `size` bytes.
 *
 * - `undefined`: no range to honour — serve the whole object. Covers a missing header, a unit
 *   other than `bytes`, malformed syntax and multi-range requests, all of which RFC 9110 lets a
 *   server answer with a plain `200`.
 * - `'unsatisfiable'`: well-formed but entirely outside the object — answer `416`.
 * - otherwise the inclusive byte range to send, clamped to the object.
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
 * Replaces `download()` to `/tmp` + `sendFile`: on Cloud Functions `/tmp` is RAM, so that held
 * the whole object in memory, and `sendFile` always sets `Content-Length` — which is what made
 * every object over 32 MiB fail.
 */
export function streamStoredObject(req: Request, res: Response, file: StreamableFile, size: number, tag: string): void {
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
  if (length <= MAX_CONTENT_LENGTH_BYTES) {
    res.header('Content-Length', String(length));
  }
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
