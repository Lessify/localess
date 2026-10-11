import type { ByteRange } from '../../../infra/storage/storage.driver.js';

/**
 * A single `Range: bytes=…` header against an object of `size` bytes (videos are where clients resume): the range to
 * send, `'unsatisfiable'` for a 416, or undefined to send the whole object.
 */
export function parseByteRange(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!match || !(match[1] || match[2])) return undefined;
  let start = match[1] ? Number(match[1]) : size - Number(match[2]);
  let end = match[1] && match[2] ? Number(match[2]) : size - 1;
  start = Math.max(0, start);
  end = Math.min(end, size - 1);
  if (start > end || start >= size) return 'unsatisfiable';
  return { start, end };
}
