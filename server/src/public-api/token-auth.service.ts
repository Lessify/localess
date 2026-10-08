import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';
import { DATABASE, Database } from '../database/database.module.js';
import { tokens } from '../database/schema.js';
import { TokenPermission } from '../domain/models/index.js';
import { sendV1Error } from './v1-response.js';

/** A space API token as the v1 API sees it. V1 tokens (no `version`) carry implicit permissions. */
export interface ApiToken {
  id: string;
  version: number | null;
  permissions: TokenPermission[];
  cacheTtl: number | null;
}

const V1_IMPLICIT = [
  TokenPermission.TRANSLATION_PUBLIC,
  TokenPermission.TRANSLATION_DRAFT,
  TokenPermission.CONTENT_PUBLIC,
  TokenPermission.CONTENT_DRAFT,
];
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

/** Alphanumeric only: the token is the row id, so `/` must never reach the lookup. */
export function validateToken(token?: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9]{20}$/.test(token);
}

export function canPerform(permission: TokenPermission, token: ApiToken): boolean {
  if (token.version === null) return V1_IMPLICIT.includes(permission);
  if (token.version === 2) return token.permissions.includes(permission);
  return false;
}

export const canPerformAny = (permissions: TokenPermission[], token: ApiToken) => permissions.some(it => canPerform(it, token));

/**
 * Query-string (`?token=`) and header (`X-API-KEY`) token checks for /api/v1, ported from
 * functions/src/v1/middleware. Query tokens are cached per instance for 5 minutes like before;
 * `invalidate` drops an entry when a token changes.
 */
@Injectable()
export class TokenAuthService {
  private readonly cache = new Map<string, { token: ApiToken; expiresAt: number }>();

  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async find(spaceId: string, tokenId: string): Promise<ApiToken | undefined> {
    const [row] = await this.db
      .select({ id: tokens.id, version: tokens.version, permissions: tokens.permissions, cacheTtl: tokens.cacheTtl })
      .from(tokens)
      .where(and(eq(tokens.spaceId, spaceId), eq(tokens.id, tokenId)));
    return row ? { ...row, permissions: (row.permissions ?? []) as TokenPermission[] } : undefined;
  }

  async findCached(spaceId: string, tokenId: string): Promise<ApiToken | undefined> {
    const key = `${spaceId}:${tokenId}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.token;
    const token = await this.find(spaceId, tokenId);
    if (token) this.cache.set(key, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    else this.cache.delete(key);
    return token;
  }

  invalidate(spaceId: string, tokenId?: string): void {
    for (const key of this.cache.keys()) {
      if (tokenId ? key === `${spaceId}:${tokenId}` : key.startsWith(`${spaceId}:`)) this.cache.delete(key);
    }
  }

  /**
   * Checks a token against `required` (any of). Sends the 401/403 itself and returns undefined when
   * the request must stop. The 401 body is the same for missing, malformed and unknown tokens.
   */
  async authorize(
    reply: FastifyReply,
    spaceId: string,
    tokenId: unknown,
    required: TokenPermission[],
    options: { cached: boolean; reason?: string },
  ): Promise<ApiToken | undefined> {
    if (!validateToken(tokenId)) {
      sendV1Error(reply, 401, 'unauthenticated', 'Missing or invalid API token');
      return undefined;
    }
    const token = options.cached ? await this.findCached(spaceId, tokenId) : await this.find(spaceId, tokenId);
    if (!token) {
      sendV1Error(reply, 401, 'unauthenticated', 'Missing or invalid API token');
      return undefined;
    }
    if (!canPerformAny(required, token)) {
      sendV1Error(reply, 403, 'permission-denied', 'Token is missing a required permission', {
        details: {
          requiredPermissions: required,
          ...(options.reason ? { reason: options.reason } : {}),
          hint: 'Add one of the required permissions to this token, or use a token that already has it.',
        },
      });
      return undefined;
    }
    return token;
  }
}
