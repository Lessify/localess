import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, Subscription } from 'rxjs';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TOKEN_V1_IMPLICIT_PERMISSIONS, TokenPermission } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { tokens } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { Params, Query, validIdParams } from '../../infra/http/v1/v1-request.js';
import { sendV1Error } from '../../infra/http/v1/v1-response.js';

/** A space API token as the v1 API sees it. V1 tokens (no `version`) carry implicit permissions. */
export interface ApiToken {
  /** The row's UUID, not the secret. */
  id: string;
  version: number | null;
  permissions: TokenPermission[];
  cacheTtl: number | null;
}

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

/** The shape of every token value: 20 alphanumerics (`newId()`, or a Firestore id for imported tokens). */
export function validateToken(token?: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9]{20}$/.test(token);
}

export function canPerform(permission: TokenPermission, token: ApiToken): boolean {
  if (token.version === null) return TOKEN_V1_IMPLICIT_PERMISSIONS.includes(permission);
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
export class TokenAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly cache = new Map<string, { token: ApiToken; expiresAt: number }>();
  private subscription?: Subscription;

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** Token edits reach every instance as change events (with the row UUID), so a revoked token stops working at once. */
  onModuleInit(): void {
    this.subscription = this.events
      .stream()
      .pipe(filter(event => event.entity === 'tokens' && event.spaceId !== null))
      .subscribe(event => this.invalidate(event.spaceId as string, event.id));
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** The token whose secret is `token` in this space. */
  async find(spaceId: string, token: string): Promise<ApiToken | undefined> {
    const [row] = await this.db
      .select({ id: tokens.id, version: tokens.version, permissions: tokens.permissions, cacheTtl: tokens.cacheTtl })
      .from(tokens)
      .where(and(eq(tokens.spaceId, spaceId), eq(tokens.token, token)));
    return row ? { ...row, permissions: (row.permissions ?? []) as TokenPermission[] } : undefined;
  }

  /** Cached by secret; entries remember the row UUID so change events can drop them. */
  async findCached(spaceId: string, secret: string): Promise<ApiToken | undefined> {
    const key = `${spaceId}:${secret}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.token;
    const token = await this.find(spaceId, secret);
    if (token) this.cache.set(key, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    else this.cache.delete(key);
    return token;
  }

  /** Drops the cached token with this row UUID, or every token of the space. */
  invalidate(spaceId: string, id?: string): void {
    for (const [key, entry] of this.cache) {
      if (key.startsWith(`${spaceId}:`) && (!id || entry.token.id === id)) this.cache.delete(key);
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

  /** Read-only DEV_TOOLS endpoints: `?token=` (cached), after the route's ids are validated. */
  async authorizeDevTools(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return false;
    const { token } = request.query as Query;
    return (await this.authorize(reply, params['spaceId'], token, [TokenPermission.DEV_TOOLS], { cached: true })) !== undefined;
  }

  /** Write endpoints for the CLI: DEV_TOOLS in the `X-API-KEY` header, never cached. */
  async authorizeApiKey(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const params = request.params as Params;
    if (!validIdParams(reply, params)) return false;
    const apiKey = request.headers['x-api-key'];
    return (await this.authorize(reply, params['spaceId'], apiKey, [TokenPermission.DEV_TOOLS], { cached: false })) !== undefined;
  }
}
