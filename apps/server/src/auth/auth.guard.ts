import { hasRole, type UserRole } from '@localess/shared';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { AUTH_KIND, type AuthKind, IS_PUBLIC, REQUIRED_ROLES } from './decorators.js';
import { SessionService } from './services/session.service.js';
import { SESSION_COOKIE } from './utils/session-cookie.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-requested-with';

/**
 * Global guard: every route needs a session unless marked `@Public()`, then the route's
 * `@RequireRole` is checked against the user's role.
 *
 * CSRF: the session cookie is SameSite=Lax, and every state-changing request that relies on it must
 * also carry `X-Requested-With` — a header a cross-site form or image can't set. The CDN and Management APIs
 * authenticate with tokens through their own guards (`@CdnToken`, `@ManagementToken`), not cookies, so they're exempt.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
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

    const session = await this.sessionService.resolve(request.cookies?.[SESSION_COOKIE]);
    if (!session) throw new UnauthorizedException();
    request.user = session.user;
    request.sessionId = session.id;

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(REQUIRED_ROLES, targets);
    if (roles && !hasRole(session.user, roles)) throw new ForbiddenException();
    return true;
  }
}
