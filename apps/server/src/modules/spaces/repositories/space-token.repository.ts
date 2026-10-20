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

  async findById(spaceId: string, id: string): Promise<TokenEntity | undefined> {
    const [row] = await this.db.select().from(tokens).where(this.byId(spaceId, id));
    return row;
  }

  create(spaceId: string, values: TokenValues, tx?: Transaction): Promise<TokenEntity> {
    return transaction(this.db, tx, async t => {
      const [row] = await t
        .insert(tokens)
        .values({ id: newUuid(), spaceId, ...values })
        .returning();
      await this.eventService.publish({ spaceId, entity: 'tokens', id: row.id, op: 'created' }, t);
      return row;
    });
  }

  /**
   * Changes a token from what it is now: `change` gets the row, locked until the transaction ends, so two changes
   * of one token never interleave. `undefined` when the space has no token `id`.
   */
  update(
    spaceId: string,
    id: string,
    change: (current: TokenEntity) => Partial<TokenValues>,
    tx?: Transaction,
  ): Promise<TokenEntity | undefined> {
    return transaction(this.db, tx, async t => {
      const [current] = await t.select().from(tokens).where(this.byId(spaceId, id)).for('update');
      if (!current) return undefined;
      const [row] = await t.update(tokens).set(change(current)).where(this.byId(spaceId, id)).returning();
      await this.eventService.publish({ spaceId, entity: 'tokens', id, op: 'updated' }, t);
      return row;
    });
  }

  /** Whether the space had token `id`. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<boolean> {
    return transaction(this.db, tx, async t => {
      const deleted = await t.delete(tokens).where(this.byId(spaceId, id)).returning({ id: tokens.id });
      if (deleted.length) await this.eventService.publish({ spaceId, entity: 'tokens', id, op: 'deleted' }, t);
      return deleted.length > 0;
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

  private byId(spaceId: string, id: string) {
    return and(eq(tokens.spaceId, spaceId), eq(tokens.id, id));
  }
}
