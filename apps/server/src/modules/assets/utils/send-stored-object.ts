import type { Readable } from 'node:stream';

import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ByteRange } from '../../../infra/storage/storage.driver.js';
import { parseByteRange } from './byte-range.js';

/**
 * Streams a stored object of `size` bytes, honouring a single `Range` (videos are where clients seek and resume):
 * `206` with the range, `416` for one outside the object, the whole object otherwise.
 */
export function sendStoredObject(request: FastifyRequest, reply: FastifyReply, size: number, open: (range?: ByteRange) => Readable): void {
  void reply.header('accept-ranges', 'bytes');
  const range = parseByteRange(request.headers.range, size);
  if (range === 'unsatisfiable') {
    void reply.code(416).header('content-range', `bytes */${size}`).send();
    return;
  }
  if (range) {
    void reply
      .code(206)
      .header('content-range', `bytes ${range.start}-${range.end}/${size}`)
      .header('content-length', range.end - range.start + 1)
      .send(open(range));
    return;
  }
  void reply.header('content-length', size).send(open());
}
