import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { ApiToken } from './utils/api-token.js';
import type { UserEntity } from '../shared/entities/user.entity.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by AuthGuard for session-authenticated requests. */
    user?: UserEntity;
    sessionId?: string;
    /** Set by the token guards (`@CdnToken`, `@ManagementToken`). */
    apiToken?: ApiToken;
  }
}

/** The signed-in user (routes behind AuthGuard always have one). */
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): UserEntity => {
  return context.switchToHttp().getRequest<FastifyRequest>().user as UserEntity;
});

export const CurrentSessionId = createParamDecorator((_: unknown, context: ExecutionContext): string => {
  return context.switchToHttp().getRequest<FastifyRequest>().sessionId as string;
});

/** The API token a token guard accepted (routes behind `@CdnToken` / `@ManagementToken` always have one). */
export const CurrentToken = createParamDecorator((_: unknown, context: ExecutionContext): ApiToken => {
  return context.switchToHttp().getRequest<FastifyRequest>().apiToken as ApiToken;
});
