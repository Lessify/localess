import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { TokenType } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { spaces, tokens } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { TokenEntity } from '../../../shared/entities/token.entity.js';

export type TokenValues = Pick<TokenEntity, 'type' | 'token' | 'tokenHash' | 'hint' | 'name' | 'cacheTtl'>;

/**
 * Space API tokens. Every change publishes a `tokens` event with the UUID, which also drops the public API's
 * 5-minute token cache on every instance.
 */
@Injectable()
export class TokenRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** Newest first; `type` keeps tokens of that type, `limit` caps the list. */
  findAll(spaceId: string, filter: { type?: TokenType; limit?: number } = {}): Promise<TokenEntity[]> {
    const conditions = [eq(tokens.spaceId, spaceId)];
    if (filter.type) conditions.push(eq(tokens.type, filter.type));
    const select = this.db
      .select()
      .from(tokens)
      .where(and(...conditions))
      .orderBy(desc(tokens.createdAt));
    return filter.limit ? select.limit(filter.limit) : select;
  }

  async findById(spaceId: string, id: string): Promise<TokenEntity | undefined> {
    const [row] = await this.db.select().from(tokens).where(this.byId(spaceId, id));
    return row;
  }

  /** `undefined` when there is no space `spaceId`. */
  create(spaceId: string, values: TokenValues, tx?: Transaction): Promise<TokenEntity | undefined> {
    return transaction(this.db, tx, async t => {
      const [space] = isUuid(spaceId) ? await t.select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId)) : [];
      if (!space) return undefined;
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

  private byId(spaceId: string, id: string) {
    return and(eq(tokens.spaceId, spaceId), eq(tokens.id, id));
  }
}
