import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { firebaseImports, spaceLocales, spaces } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { scheduleSpaceFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import { findSpace, requireSpace, selectSpaces, type SpaceRow } from '../../../shared/queries/space.query.js';
import { createPreviewToken } from '../../../shared/data-rules/space-tokens.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import { changeSpace } from './space-change.js';
import type { SpacePageable } from '../models/space.models.js';

/**
 * Spaces (their locales and environments: `SpaceLocaleRepository`, `SpaceEnvironmentRepository`). Every change, in
 * one transaction, touches the space's `updated_at` and sends a `spaces` event (`changeSpace`).
 */
@Injectable()
export class SpaceRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventService,
  ) {}

  /**
   * One page by the query's sort (`name` case-insensitive whatever the database collation), then the id so equal
   * values page stably; and how many match its filters.
   */
  async findPage(query: SpacePageable): Promise<{ rows: SpaceRow[]; total: number }> {
    const conditions: SQL[] = [];
    if (query.search) {
      // The name, or any part of the id (as the table shows it), case-insensitive.
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(spaces.name, pattern), ilike(sql`${spaces.id}::text`, pattern)) as SQL);
    }
    if (query.importing === false) {
      conditions.push(
        sql`not exists (select 1 from ${firebaseImports} fi where fi.space_id = ${spaces.id} and fi.status in ('RUNNING', 'FAILED'))`,
      );
    }
    const where = and(...conditions);
    const order = query.direction === 'desc' ? desc : asc;
    const column = { name: sql`lower(${spaces.name})`, id: spaces.id, updatedAt: spaces.updatedAt }[query.sort];
    const rows = await selectSpaces(this.db)
      .where(where)
      .orderBy(order(column), asc(spaces.id))
      .limit(query.size)
      .offset(offsetOf(query));
    const [{ total }] = await this.db.select({ total: count() }).from(spaces).where(where);
    return { rows, total };
  }

  findById(spaceId: string): Promise<SpaceRow | undefined> {
    return findSpace(this.db, spaceId);
  }

  /** With its first locale, the default one, and its auto-generated preview token. `id`: one chosen beforehand. */
  create(name: string, defaultLocaleId: string, tx?: Transaction, id: string = newUuid()): Promise<SpaceRow> {
    return transaction(this.db, tx, async t => {
      await t.insert(spaces).values({ id, name, defaultLocaleId });
      await t.insert(spaceLocales).values({ spaceId: id, localeId: defaultLocaleId, position: 0 });
      await createPreviewToken(t, id);
      await this.events.publish({ spaceId: null, entity: 'spaces', id, op: 'created' }, t);
      return requireSpace(t, id);
    });
  }

  rename(spaceId: string, name: string, tx?: Transaction): Promise<SpaceRow> {
    return changeSpace(this.db, this.events, spaceId, tx, async () => ({ name }));
  }

  /** Everything in the space goes with it: rows by FK cascade, stored files queued for the sweeper. */
  delete(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(spaces).where(eq(spaces.id, spaceId));
      await scheduleSpaceFilesDeletion(t, spaceId);
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'deleted' }, t);
    });
  }
}
