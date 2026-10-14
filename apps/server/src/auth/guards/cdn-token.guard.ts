import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { TokenType } from '@localess/shared';
import { V1Error } from '../../infra/http/v1/v1-error.js';
import { assertValidIdParams, type Params, type Query } from '../../infra/http/v1/v1-request.js';
import { parseApiToken } from '../../shared/utils/api-token-format.js';
import { CDN_TOKEN_RULE, type CdnTokenRule } from '../decorators.js';
import { TokenAuthService } from '../services/token-auth.service.js';

const INVALID = 'Missing or invalid API token';
const MANAGEMENT_HINT = 'Management tokens go in the Authorization header on /api/manage/v1.';
/** On the CDN a preview token can do what a public one can; management tokens have no rank here. */
const RANK: Partial<Record<TokenType, number>> = { [TokenType.PUBLIC]: 0, [TokenType.PREVIEW]: 1 };
const CDN_TYPES = [TokenType.PUBLIC, TokenType.PREVIEW];

/**
 * `?token=` on the CDN API: ids first (400), then the value's shape and checksum, then the cached lookup (401, the same body
 * whatever was wrong), then the type the route needs (403). A management value is refused before any lookup: it doesn't
 * belong in a URL.
 */
@Injectable()
export class CdnTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const rule = this.reflector.getAllAndOverride<CdnTokenRule>(CDN_TOKEN_RULE, [context.getHandler(), context.getClass()]);
    const params = request.params as Params;
    assertValidIdParams(params);
    const { token: value, version } = request.query as Query;
    const claimed = parseApiToken(value);
    if (claimed === TokenType.MANAGEMENT) throw new V1Error(401, 'unauthenticated', INVALID, { details: { hint: MANAGEMENT_HINT } });
    if (!claimed) throw new V1Error(401, 'unauthenticated', INVALID);
    const token = await this.tokens.findCached(params['spaceId'], value as string);
    const rank = token && RANK[token.type];
    if (!token || rank === undefined) throw new V1Error(401, 'unauthenticated', INVALID);
    const draft = version !== undefined;
    const required = RANK[draft ? rule.draft : rule.published] as number;
    if (rank < required) {
      throw new V1Error(403, 'permission-denied', 'Token type not allowed for this request', {
        details: {
          requiredTypes: CDN_TYPES.filter(it => (RANK[it] as number) >= required),
          reason: draft ? rule.reason.draft : rule.reason.published,
          hint: 'Use a token of one of the required types.',
        },
      });
    }
    request.apiToken = token;
    return true;
  }
}
