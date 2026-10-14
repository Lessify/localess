import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TokenType } from '@localess/shared';
import { V1Error } from '../../infra/http/v1/v1-error.js';
import { assertValidIdParams, type Params } from '../../infra/http/v1/v1-request.js';
import { parseApiToken } from '../../shared/utils/api-token-format.js';
import { TokenAuthService } from '../services/token-auth.service.js';

const NO_STORE = 'no-store';
/** RFC 7235: the scheme is case-insensitive; exactly one value after it. */
const BEARER = /^Bearer (\S+)$/i;

/**
 * `Authorization: Bearer mgt_…` on the Management API, checked against the database on every request (no cache: a revoked
 * token stops at once). Any failure is the same 401 with `WWW-Authenticate: Bearer`. Every response is `no-store`.
 */
@Injectable()
export class ManagementTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokenAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    void http.getResponse<FastifyReply>().header('cache-control', NO_STORE);
    const params = request.params as Params;
    assertValidIdParams(params, NO_STORE);
    const value = BEARER.exec(request.headers.authorization ?? '')?.[1];
    const unauthenticated = new V1Error(401, 'unauthenticated', 'Missing or invalid API token', {
      cacheControl: NO_STORE,
      headers: { 'www-authenticate': 'Bearer' },
    });
    if (parseApiToken(value) !== TokenType.MANAGEMENT) throw unauthenticated;
    const token = await this.tokens.find(params['spaceId'], value as string);
    if (!token || token.type !== TokenType.MANAGEMENT) throw unauthenticated;
    request.apiToken = token;
    return true;
  }
}
