import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { filter, Subscription } from 'rxjs';

import { EventService } from '../../infra/events/event.service.js';
import type { SpaceImportStatus } from '../../shared/utils/import-status.js';
import { ApiTokenRepository } from '../repositories/api-token.repository.js';
import type { ApiToken } from '../utils/api-token.js';
import { hashToken } from '../utils/token-hash.js';

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Token lookups for the token guards: the CDN API's are cached per instance for 5 minutes (`findCached`), the Management
 * API's are not (`find`); `invalidate` drops an entry when a token changes.
 */
@Injectable()
export class TokenAuthService implements OnModuleInit, OnModuleDestroy {
  private readonly cache = new Map<string, { token: ApiToken; expiresAt: number }>();
  private subscription?: Subscription;

  constructor(
    private readonly apiTokenRepository: ApiTokenRepository,
    private readonly eventService: EventService,
  ) {}

  /** Token edits reach every instance as change events (with the row UUID), so a revoked token stops working at once. */
  onModuleInit(): void {
    this.subscription = this.eventService
      .stream()
      .pipe(filter(event => event.entity === 'tokens' && event.spaceId !== null))
      .subscribe(event => this.invalidate(event.spaceId as string, event.id));
  }

  onModuleDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** The token whose value is `value` in this space (looked up by its hash). */
  find(spaceId: string, value: string): Promise<ApiToken | undefined> {
    return this.apiTokenRepository.findByHash(spaceId, hashToken(value));
  }

  /** Cached by the value's hash (the value itself is never kept); entries remember the row UUID so change events can drop them. */
  async findCached(spaceId: string, value: string): Promise<ApiToken | undefined> {
    const tokenHash = hashToken(value);
    const key = `${spaceId}:${tokenHash}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.token;
    const token = await this.apiTokenRepository.findByHash(spaceId, tokenHash);
    if (token) this.cache.set(key, { token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    else this.cache.delete(key);
    return token;
  }

  /** Whether the space's import runs or failed (`null`: usable). Not cached: it changes while the space imports. */
  findImportStatus(spaceId: string): Promise<SpaceImportStatus | null> {
    return this.apiTokenRepository.findImportStatus(spaceId);
  }

  /** Drops the cached token with this row UUID, or every token of the space. */
  invalidate(spaceId: string, id?: string): void {
    for (const [key, entry] of this.cache) {
      if (key.startsWith(`${spaceId}:`) && (!id || entry.token.id === id)) this.cache.delete(key);
    }
  }
}
