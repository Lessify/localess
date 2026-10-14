import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { canPerform, hasAnyRole } from '@localess/shared';
import { toPrincipal } from '../shared/transformers/user.transformer.js';
import { AUTH_KIND, type AuthKind, IS_PUBLIC, REQUIRED_ACCESS, RequiredAccess } from './decorators.js';
import { SessionService } from './services/session.service.js';
import { SESSION_COOKIE } from './utils/session-cookie.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-requested-with';

/**
 * Global guard: every route needs a session unless marked `@Public()`, then the route's
 * `@Require*` metadata is checked against the user's role and permissions.
 *
 * CSRF: the session cookie is SameSite=Lax, and every state-changing request that relies on it must
 * also carry `X-Requested-With` — a header a cross-site form or image can't set. The CDN and Management APIs
 * authenticate with tokens through their own guards (`@CdnToken`, `@ManagementToken`), not cookies, so they're exempt.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const targets = [context.getHandler(), context.getClass()];

    // Token routes are authenticated by their own guard (@CdnToken / @ManagementToken) and send no cookie: no CSRF check.
    if (this.reflector.getAllAndOverride<AuthKind | undefined>(AUTH_KIND, targets)) return true;

    if (!SAFE_METHODS.has(request.method) && !request.headers[CSRF_HEADER]) {
      throw new ForbiddenException('Missing X-Requested-With header');
    }

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const session = await this.sessions.resolve(request.cookies?.[SESSION_COOKIE]);
    if (!session) throw new UnauthorizedException();
    request.user = session.user;
    request.sessionId = session.id;

    const access = this.reflector.getAllAndOverride<RequiredAccess | undefined>(REQUIRED_ACCESS, targets);
    if (!access) return true;
    const principal = toPrincipal(session.user);
    const allowed =
      access.kind === 'admin'
        ? principal.role === 'ADMIN'
        : access.kind === 'anyRole'
          ? hasAnyRole(principal)
          : access.kind === 'anyOf'
            ? access.permissions.some(permission => canPerform(principal, permission))
            : access.permissions.every(permission => canPerform(principal, permission));
    if (!allowed) throw new ForbiddenException();
    return true;
  }
}
