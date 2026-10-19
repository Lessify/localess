import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, max, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { firebaseImports, keepUpdatedAt, spaceEnvironments, spaceLocales, spaces } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { scheduleSpaceFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import { dropTranslationDrafts, dropTranslationLocale } from '../../../shared/data-rules/translation-drafts.js';
import { dropContentDrafts, dropContentLocale } from '../../../shared/data-rules/content-snapshots.js';
import { findSpace, requireSpace, selectSpaces, type SpaceRow } from '../../../shared/queries/space.query.js';
import { createPreviewToken } from '../../../shared/data-rules/space-tokens.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import type { SpacePageable } from '../models/space.models.js';

type SpaceValues = Partial<Pick<typeof spaces.$inferInsert, 'name' | 'defaultLocaleId'>>;

/**
 * Spaces with their locales (`space_locales`) and environments (`space_environments`). Every change, in one
 * transaction: the rows, the space's `updated_at` (a change of locales or environments alone still touches the
 * space) and a `spaces` event. A change of the locales or the default locale also drops the translation drafts.
 */
@Injectable()
export class SpacesRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
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
    return this.change(spaceId, tx, async () => ({ name }));
  }

  /** At the end of the space's list. */
  addEnvironment(spaceId: string, environment: { name: string; url: string }, tx?: Transaction): Promise<SpaceRow> {
    return this.change(spaceId, tx, async t => {
      const [{ last }] = await t
        .select({ last: max(spaceEnvironments.position) })
        .from(spaceEnvironments)
        .where(eq(spaceEnvironments.spaceId, spaceId));
      await t.insert(spaceEnvironments).values({ id: newUuid(), spaceId, ...environment, position: (last ?? -1) + 1 });
    });
  }

  /** `undefined` when the space has no environment `environmentId`. */
  updateEnvironment(
    spaceId: string,
    environmentId: string,
    environment: { name: string; url: string },
    tx?: Transaction,
  ): Promise<SpaceRow | undefined> {
    return this.changeIfFound(spaceId, tx, async t => {
      const updated = await t
        .update(spaceEnvironments)
        .set(environment)
        .where(this.environment(spaceId, environmentId))
        .returning({ id: spaceEnvironments.id });
      return updated.length > 0;
    });
  }

  /** `undefined` when the space has no environment `environmentId`. */
  deleteEnvironment(spaceId: string, environmentId: string, tx?: Transaction): Promise<SpaceRow | undefined> {
    return this.changeIfFound(spaceId, tx, async t => {
      const deleted = await t
        .delete(spaceEnvironments)
        .where(this.environment(spaceId, environmentId))
        .returning({ id: spaceEnvironments.id });
      return deleted.length > 0;
    });
  }

  /** `environmentIds`: every environment of the space, in the new order. */
  reorderEnvironments(spaceId: string, environmentIds: string[], tx?: Transaction): Promise<SpaceRow> {
    return this.change(spaceId, tx, async t => {
      for (const [position, id] of environmentIds.entries()) {
        await t
          .update(spaceEnvironments)
          .set({ position, ...keepUpdatedAt(spaceEnvironments) })
          .where(this.environment(spaceId, id));
      }
    });
  }

  /** At the end of the space's list; the translation drafts gain the locale. */
  addLocale(spaceId: string, localeId: string, tx?: Transaction): Promise<SpaceRow> {
    return this.change(spaceId, tx, async t => {
      const [{ last }] = await t
        .select({ last: max(spaceLocales.position) })
        .from(spaceLocales)
        .where(eq(spaceLocales.spaceId, spaceId));
      await t.insert(spaceLocales).values({ spaceId, localeId, position: (last ?? -1) + 1 });
      await dropTranslationDrafts(t, spaceId);
    });
  }

  /** Its values stay; its translation maps and content snapshots go (requests for it get the default locale's). */
  removeLocale(spaceId: string, localeId: string, tx?: Transaction): Promise<SpaceRow> {
    return this.change(spaceId, tx, async t => {
      await t.delete(spaceLocales).where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      await dropTranslationDrafts(t, spaceId);
      await dropTranslationLocale(t, spaceId, localeId);
      await dropContentLocale(t, spaceId, localeId);
    });
  }

  /** `localeIds`: every locale of the space, in the new order. */
  reorderLocales(spaceId: string, localeIds: string[], tx?: Transaction): Promise<SpaceRow> {
    return this.change(spaceId, tx, async t => {
      for (const [position, localeId] of localeIds.entries()) {
        await t
          .update(spaceLocales)
          .set({ position })
          .where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      }
    });
  }

  /**
   * Draft translation maps fill gaps from the default locale and content drafts read it from the bare fields, so both
   * go; published ones keep what their publish built.
   */
  setDefaultLocale(spaceId: string, localeId: string, tx?: Transaction): Promise<SpaceRow> {
    return this.change(spaceId, tx, async t => {
      await dropTranslationDrafts(t, spaceId);
      await dropContentDrafts(t, spaceId);
      return { defaultLocaleId: localeId };
    });
  }

  /** Everything in the space goes with it: rows by FK cascade, stored files queued for the sweeper. */
  delete(spaceId: string, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await t.delete(spaces).where(eq(spaces.id, spaceId));
      await scheduleSpaceFilesDeletion(t, spaceId);
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'deleted' }, t);
    });
  }

  /** Runs `work`, then touches the space's `updated_at` (with the values `work` returns) and announces it. */
  private change(spaceId: string, tx: Transaction | undefined, work: (tx: Transaction) => Promise<SpaceValues | void>): Promise<SpaceRow> {
    return transaction(this.db, tx, async t => this.touch(t, spaceId, (await work(t)) ?? {}));
  }

  /** As `change`, for work on a row that may not be there: `work` answers `false` then, and nothing is touched. */
  private changeIfFound(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<boolean>,
  ): Promise<SpaceRow | undefined> {
    return transaction(this.db, tx, async t => ((await work(t)) ? this.touch(t, spaceId, {}) : undefined));
  }

  private async touch(tx: Transaction, spaceId: string, values: SpaceValues): Promise<SpaceRow> {
    await tx
      .update(spaces)
      // Named: a change of locales or environments alone still touches the space.
      .set({ ...values, updatedAt: new Date() })
      .where(eq(spaces.id, spaceId));
    await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' }, tx);
    return requireSpace(tx, spaceId);
  }

  private environment(spaceId: string, environmentId: string) {
    return and(eq(spaceEnvironments.spaceId, spaceId), eq(spaceEnvironments.id, environmentId));
  }
}
