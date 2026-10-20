import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SpaceLocalePageable } from '@localess/shared';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { locales, spaceLocales } from '../../../infra/database/schema.js';
import type { Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropContentLocale } from '../../../shared/data-rules/content-snapshots.js';
import { dropTranslationDrafts, dropTranslationLocale } from '../../../shared/data-rules/translation-drafts.js';
import type { LocaleEntity } from '../../../shared/entities/locale.entity.js';
import type { SpaceLocaleSelect } from '../../../shared/entities/space-locale.entity.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import { moveTo } from '../utils/move.js';
import { changeSpace } from './space-change.js';

/**
 * A space's locales (`space_locales`; the default locale is the space's: `SpaceRepository.setDefaultLocale`). Every change touches the space and announces it
 * (`changeSpace`), and drops the translation drafts and content snapshots it makes stale.
 */
@Injectable()
export class SpaceLocaleRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /**
   * One page, each with its locale, by the query's sort (`position`: the space's order; `id`, `name`: the locale's), then
   * the locale id so equal values page stably. The callbacks' columns, not `spaceLocales`: the query aliases the table.
   */
  findAll(spaceId: string, query: SpaceLocalePageable): Promise<SpaceLocaleSelect[]> {
    const order = query.direction === 'desc' ? desc : asc;
    return this.db.query.spaceLocales.findMany({
      where: columns => this.where(columns, spaceId, query),
      orderBy: columns => {
        // A query builder, not raw SQL: the query would re-alias the locale's columns in raw SQL as its own table's.
        const name = sql`(${this.db
          .select({ name: sql`lower(${locales.name})` })
          .from(locales)
          .where(eq(locales.id, columns.localeId))})`;
        return [order({ position: columns.position, id: columns.localeId, name }[query.sort]), asc(columns.localeId)];
      },
      limit: query.size,
      offset: offsetOf(query),
      with: { locale: true },
    });
  }

  /** How many of the space's locales match the query's search. */
  findAllCount(spaceId: string, query: SpaceLocalePageable): Promise<number> {
    return this.db.$count(spaceLocales, this.where(spaceLocales, spaceId, query));
  }

  /** Every locale of the space, in its order, as `{ id, name }`. */
  async findAllNames(spaceId: string): Promise<Pick<LocaleEntity, 'id' | 'name'>[]> {
    const rows = await this.db.query.spaceLocales.findMany({
      columns: { localeId: true },
      where: eq(spaceLocales.spaceId, spaceId),
      orderBy: [asc(spaceLocales.position), asc(spaceLocales.createdAt)],
      with: { locale: { columns: { id: true, name: true } } },
    });
    return rows.map(it => it.locale);
  }

  /** The space's locale with its locale. */
  findOne(spaceId: string, localeId: string): Promise<SpaceLocaleSelect | undefined> {
    return this.db.query.spaceLocales.findFirst({
      where: and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)),
      with: { locale: true },
    });
  }

  /** At the end of the space's list; the translation drafts gain the locale. Already there (added meanwhile): nothing changes. */
  create(spaceId: string, localeId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      const last = await t.query.spaceLocales.findFirst({
        columns: { position: true },
        where: eq(spaceLocales.spaceId, spaceId),
        orderBy: desc(spaceLocales.position),
      });
      const added = await t
        .insert(spaceLocales)
        .values({ spaceId, localeId, position: (last?.position ?? -1) + 1 })
        .onConflictDoNothing()
        .returning({ localeId: spaceLocales.localeId });
      if (!added.length) return false;
      await dropTranslationDrafts(t, spaceId);
      return {}; // the space touched alone
    });
  }

  /**
   * Its values stay; its translation maps and content snapshots go (requests for it get the default locale's). The
   * default locale is refused (409: it became the default after the service checked).
   */
  delete(spaceId: string, localeId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async (t, space) => {
      if (space.defaultLocaleId === localeId) throw new ConflictException(`Locale ${localeId} is the space's default locale`);
      await t.delete(spaceLocales).where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      await dropTranslationDrafts(t, spaceId);
      await dropTranslationLocale(t, spaceId, localeId);
      await dropContentLocale(t, spaceId, localeId);
    });
  }

  /**
   * The locale to `position` in the space's order, the others shifting (`moveTo`); only the rows that change are
   * written. Read under the space's lock (`changeSpace`): two moves run one after the other. Nothing written, no event,
   * when it is already there or no longer there.
   */
  move(spaceId: string, localeId: string, position: number, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      const rows = await t.query.spaceLocales.findMany({
        columns: { localeId: true, position: true },
        where: eq(spaceLocales.spaceId, spaceId),
        orderBy: [asc(spaceLocales.position), asc(spaceLocales.createdAt)],
      });
      const changes = moveTo(
        rows.map(it => ({ id: it.localeId, position: it.position })),
        localeId,
        position,
      );
      if (!changes?.length) return false;
      for (const change of changes) {
        await t
          .update(spaceLocales)
          .set({ position: change.position })
          .where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, change.id)));
      }
      return {}; // the space touched alone
    });
  }

  /** The space's locales, and the query's search (the locale's id or name); `columns`: the table's, as the query names it. */
  private where(columns: Pick<typeof spaceLocales, 'spaceId' | 'localeId'>, spaceId: string, query: SpaceLocalePageable): SQL | undefined {
    const conditions: SQL[] = [eq(columns.spaceId, spaceId)];
    if (query.search) {
      const pattern = containsPattern(query.search);
      const matching = this.db
        .select({ id: locales.id })
        .from(locales)
        .where(or(ilike(locales.id, pattern), ilike(locales.name, pattern)));
      conditions.push(inArray(columns.localeId, matching));
    }
    return and(...conditions);
  }
}
