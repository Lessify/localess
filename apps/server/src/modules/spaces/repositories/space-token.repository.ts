import type { SpaceTokenPageable } from '@localess/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, or, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { tokens } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TokenEntity } from '../../../shared/entities/token.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';

export type TokenValues = Pick<TokenEntity, 'type' | 'token' | 'tokenHash' | 'hint' | 'name' | 'cacheTtl'>;

/**
 * Space API tokens. Every change publishes a `tokens` event with the UUID, which also drops the public API's
 * 5-minute token cache on every instance.
 */
@Injectable()
export class SpaceTokenRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /**
   * One page by the query's sort (`createdAt` newest first by default; `name` case-insensitive), then the id so equal
   * values page stably.
   */
  findAll(spaceId: string, query: SpaceTokenPageable): Promise<TokenEntity[]> {
    const order = query.direction === 'desc' ? desc : asc;
    const column = {
      createdAt: tokens.createdAt,
      updatedAt: tokens.updatedAt,
      name: sql`lower(${tokens.name})`,
      type: tokens.type,
    }[query.sort];
    return this.db.query.tokens.findMany({
      where: this.where(spaceId, query),
      orderBy: [order(column), asc(tokens.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many of the space's tokens match the query's type and search. */
  findAllCount(spaceId: string, query: SpaceTokenPageable): Promise<number> {
    return this.db.$count(tokens, this.where(spaceId, query));
  }

  findOne(spaceId: string, tokenId: string): Promise<TokenEntity | undefined> {
    return this.db.query.tokens.findFirst({ where: this.byId(spaceId, tokenId) });
  }

  /** Answers the new token's id. */
  async create(spaceId: string, values: TokenValues, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await transaction(this.db, tx, async t => {
      await t.insert(tokens).values({ id, spaceId, ...values });
      await this.eventService.publish({ spaceId, entity: 'tokens', id, op: 'created' }, t);
    });
    return id;
  }

  /** The name and cache TTL, or a new value (`token`, `token_hash` and `hint` together); the type never changes. */
  update(spaceId: string, tokenId: string, values: Partial<Omit<TokenValues, 'type'>>, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.update(tokens).set(values).where(this.byId(spaceId, tokenId));
      await this.eventService.publish({ spaceId, entity: 'tokens', id: tokenId, op: 'updated' }, t);
    });
  }

  /** The event only when a row went (deleted meanwhile: nothing to announce). */
  delete(spaceId: string, tokenId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      const deleted = await t.delete(tokens).where(this.byId(spaceId, tokenId)).returning({ id: tokens.id });
      if (deleted.length) await this.eventService.publish({ spaceId, entity: 'tokens', id: tokenId, op: 'deleted' }, t);
    });
  }

  /** The space's tokens, of the query's type, and its search (the name or the hint). */
  private where(spaceId: string, query: SpaceTokenPageable): SQL | undefined {
    const conditions: SQL[] = [eq(tokens.spaceId, spaceId)];
    if (query.type) conditions.push(eq(tokens.type, query.type));
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(tokens.name, pattern), ilike(tokens.hint, pattern)) as SQL);
    }
    return and(...conditions);
  }

  private byId(spaceId: string, tokenId: string): SQL | undefined {
    return and(eq(tokens.spaceId, spaceId), eq(tokens.id, tokenId));
  }
}
