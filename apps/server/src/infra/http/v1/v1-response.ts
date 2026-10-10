import type { FastifyReply } from 'fastify';

/** Firebase `HttpsError` codes the v1 API answers with, and their canonical names. */
const STATUS = {
  'invalid-argument': 'INVALID_ARGUMENT',
  'not-found': 'NOT_FOUND',
  unauthenticated: 'UNAUTHENTICATED',
  'permission-denied': 'PERMISSION_DENIED',
  'failed-precondition': 'FAILED_PRECONDITION',
  internal: 'INTERNAL',
  unavailable: 'UNAVAILABLE',
} as const;

export type V1ErrorCode = keyof typeof STATUS;

/**
 * Sends an error body byte-compatible with what the Express app sent for `new HttpsError(...)`:
 * `{ details?, message, status }` (firebase-functions `HttpsError.toJSON`).
 */
export function sendV1Error(
  reply: FastifyReply,
  httpStatus: number,
  code: V1ErrorCode,
  message: string,
  options: { details?: unknown; cacheControl?: string } = {},
): void {
  if (options.cacheControl) void reply.header('cache-control', options.cacheControl);
  void reply
    .code(httpStatus)
    .type('application/json; charset=utf-8')
    .send(JSON.stringify({ ...(options.details === undefined ? {} : { details: options.details }), message, status: STATUS[code] }));
}

/** Same as Express `encodeURIComponent` re-insertion in `cv` redirects (see functions/src/v1/cdn.ts `q`). */
export const q = (value: unknown): string => encodeURIComponent(String(value));
