import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { UserRow } from './users/users.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by AuthGuard for session-authenticated requests. */
    user?: UserRow;
    sessionId?: string;
  }
}

/** The signed-in user (routes behind AuthGuard always have one). */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): UserRow => {
  return context.switchToHttp().getRequest<FastifyRequest>().user as UserRow;
});

export const CurrentSessionId = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  return context.switchToHttp().getRequest<FastifyRequest>().sessionId as string;
});
