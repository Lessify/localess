import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { sendV1Error, type V1ErrorCode } from './v1-response.js';

export interface V1ErrorOptions {
  details?: unknown;
  cacheControl?: string;
  headers?: Record<string, string>;
}

/** An error a guard or handler of the public APIs throws; `V1ExceptionFilter` answers it with the v1 body. */
export class V1Error extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: V1ErrorCode,
    message: string,
    readonly options: V1ErrorOptions = {},
  ) {
    super(message);
  }
}

/** Writes `{ details?, message, status }` (sendV1Error), so guard errors look like handler errors. */
@Catch(V1Error)
export class V1ExceptionFilter implements ExceptionFilter {
  catch(error: V1Error, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    for (const [name, value] of Object.entries(error.options.headers ?? {})) void reply.header(name, value);
    sendV1Error(reply, error.httpStatus, error.code, error.message, error.options);
  }
}
