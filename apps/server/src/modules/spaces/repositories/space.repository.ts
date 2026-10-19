import { Inject, Injectable } from '@nestjs/common';
import type { SpacePageable } from '@localess/shared';
import { and, asc, count, desc, eq, ilike, inArray, notExists, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { firebaseImports, spaceLocales, spaces } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { scheduleSpaceFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import { createPreviewToken } from '../../../shared/data-rules/space-tokens.js';
import type { SpaceEntity, SpaceSelect, SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import { changeSpace } from './space-change.js';

/**
 * Spaces (their locales and environments: `SpaceLocaleRepository`, `SpaceEnvironmentRepository`). Reads answer
 * entities; every change, in one transaction, touches the space's `updated_at` and sends a `spaces` event
 * (`changeSpace`).
 */
@Injectable()
export class SpaceRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /**
   * One page by the query's sort (`name` case-insensitive whatever the database collation), then the id so equal
   * values page stably; each with its Firebase import, if any.
   */
  findAll(query: SpacePageable): Promise<SpaceSelect[]> {
    const order = query.direction === 'desc' ? desc : asc;
    const column = { name: sql`lower(${spaces.name})`, id: spaces.id, updatedAt: spaces.updatedAt }[query.sort];
    return this.db.query.spaces.findMany({
      where: this.where(query),
      orderBy: [order(column), asc(spaces.id)],
      limit: query.size,
      offset: offsetOf(query),
      with: { firebaseImport: true },
    });
  }

  /** How many spaces match the query's filters. */
  async findAllCount(query: SpacePageable): Promise<number> {
    const [{ total }] = await this.db.select({ total: count() }).from(spaces).where(this.where(query));
    return total;
  }

  /** Every space that can be opened (not importing, no failed import), by name: the sidebar list. */
  findAllNames(): Promise<Pick<SpaceEntity, 'id' | 'name'>[]> {
    return this.db.query.spaces.findMany({
      columns: { id: true, name: true },
      where: this.openable(),
      orderBy: [asc(sql`lower(${spaces.name})`), asc(spaces.id)],
    });
  }

  /** The space with its default locale and its locales (each with its locale), in position order. */
  findOne(spaceId: string): Promise<SpaceWithLocales | undefined> {
    if (!isUuid(spaceId)) return Promise.resolve(undefined);
    return this.db.query.spaces.findFirst({
      where: eq(spaces.id, spaceId),
      with: {
        defaultLocale: true,
        spaceLocales: { orderBy: [asc(spaceLocales.position), asc(spaceLocales.createdAt)], with: { locale: true } },
      },
    });
  }

  /** Whether the space's import from Firebase is running (it can not be deleted then). */
  async isImporting(spaceId: string): Promise<boolean> {
    const run = await this.db.query.firebaseImports.findFirst({
      where: and(eq(firebaseImports.spaceId, spaceId), eq(firebaseImports.status, 'RUNNING')),
      columns: { id: true },
    });
    return run !== undefined;
  }

  /** The space with its first locale, the default one, and its auto-generated preview token; answers its id. */
  create(name: string, defaultLocaleId: string, tx?: Transaction, id: string = newUuid()): Promise<string> {
    return transaction(this.db, tx, async t => {
      await t.insert(spaces).values({ id, name, defaultLocaleId });
      await t.insert(spaceLocales).values({ spaceId: id, localeId: defaultLocaleId, position: 0 });
      await createPreviewToken(t, id);
      await this.eventService.publish({ spaceId: null, entity: 'spaces', id, op: 'created' }, t);
      return id;
    });
  }

  rename(spaceId: string, name: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async () => ({ name }));
  }

  /** Everything in the space goes with it: rows by FK cascade, stored files queued for the sweeper. */
  delete(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(spaces).where(eq(spaces.id, spaceId));
      await scheduleSpaceFilesDeletion(t, spaceId);
      await this.eventService.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'deleted' }, t);
    });
  }

  /** The query's search (the name, or any part of the id) and `importing=false`. */
  private where(query: SpacePageable): SQL | undefined {
    const conditions: SQL[] = [];
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(spaces.name, pattern), ilike(sql`${spaces.id}::text`, pattern)) as SQL);
    }
    if (query.importing === false) conditions.push(this.openable());
    return and(...conditions);
  }

  /** Not importing from Firebase, and no failed import: a space that can be opened. */
  private openable(): SQL {
    return notExists(
      this.db
        .select({ id: firebaseImports.id })
        .from(firebaseImports)
        .where(and(eq(firebaseImports.spaceId, spaces.id), inArray(firebaseImports.status, ['RUNNING', 'FAILED']))),
    );
  }
}
