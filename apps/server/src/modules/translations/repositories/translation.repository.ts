import type { TranslationNodePageable, TranslationPageable } from '@localess/shared';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, arrayOverlaps, asc, desc, eq, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { translations } from '../../../infra/database/schema.js';
import { isUniqueViolation, type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropTranslationDrafts } from '../../../shared/data-rules/translation-drafts.js';
import type { TranslationEntity } from '../../../shared/entities/translation.entity.js';
import { containsPattern, escapeLike, offsetOf } from '../../../shared/utils/paging.js';

export type NewTranslation = Pick<TranslationEntity, 'key' | 'locales' | 'labels' | 'description'>;
export type TranslationUpdate = Partial<Pick<TranslationEntity, 'key' | 'labels' | 'description'>>;

type Change = { id?: string; op: 'created' | 'updated' | 'deleted' };

/** The filter of both views, and the space's locales (what "translated in every locale" counts against). */
export type TranslationFilter = Omit<TranslationPageable, 'page' | 'size' | 'sort' | 'direction'>;

/** One level of the tree, before its translations are read: the segment, whether a key ends there, the keys below. */
export interface TranslationNodeRow {
  name: string;
  isKey: boolean;
  children: number;
}

/**
 * The `translations` rows of a space. Every write, in one transaction: the change, the space's draft maps dropped (the
 * next draft request builds them, under a new cv) and a `translations` change event per changed row. A key already
 * taken in the space is a `ConflictException`.
 */
@Injectable()
export class TranslationRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** For the app: by key, in the database collation. */
  findAll(spaceId: string): Promise<TranslationEntity[]> {
    return this.db.query.translations.findMany({ where: eq(translations.spaceId, spaceId), orderBy: [asc(translations.key)] });
  }

  /** For the public API and export files: by key in byte order, so the order consumers have always seen stays stable. */
  findAllInByteOrder(spaceId: string): Promise<TranslationEntity[]> {
    return this.db.query.translations.findMany({
      where: eq(translations.spaceId, spaceId),
      orderBy: [asc(sql`${translations.key} collate "C"`)],
    });
  }

  /** One page of the list, filtered (`where`), by the query's sort, then the id so equal values page stably. */
  findPage(spaceId: string, query: TranslationPageable, localeIds: string[]): Promise<TranslationEntity[]> {
    const order = query.direction === 'desc' ? desc : asc;
    const column = { key: translations.key, createdAt: translations.createdAt, updatedAt: translations.updatedAt }[query.sort];
    return this.db.query.translations.findMany({
      where: this.where(spaceId, query, localeIds),
      orderBy: [order(column), asc(translations.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
  }

  /** How many keys match the filter. */
  findPageCount(spaceId: string, query: TranslationFilter, localeIds: string[]): Promise<number> {
    return this.db.$count(translations, this.where(spaceId, query, localeIds));
  }

  /**
   * One level of the tree below `parent` (none: the top level), from the keys that match the filter: each segment once,
   * by name as the list sorts keys (the database collation; byte order breaks ties), with whether a key ends there and how
   * many matching keys lie below. A group without a match is not there. The prefix match uses the byte-order index.
   */
  async findNodes(
    spaceId: string,
    query: TranslationNodePageable,
    localeIds: string[],
  ): Promise<{ rows: TranslationNodeRow[]; total: number }> {
    const prefix = query.parent ? `${query.parent}.` : '';
    const segments = sql`
      SELECT split_part(substr(${translations.key}, ${prefix.length + 1}), '.', 1) AS name, ${translations.key} AS key
      FROM ${translations}
      WHERE ${this.where(spaceId, query, localeIds)}
        AND ${translations.key} COLLATE "C" LIKE ${`${escapeLike(prefix)}%`}`;
    const order = query.direction === 'desc' ? sql`DESC` : sql`ASC`;
    const [rows, [{ total }]] = await Promise.all([
      this.db.execute<{ name: string; is_key: boolean; children: number }>(sql`
        SELECT name, bool_or(key = ${prefix} || name) AS is_key, (count(*) FILTER (WHERE key <> ${prefix} || name))::int AS children
        FROM (${segments}) AS level
        GROUP BY name
        ORDER BY name ${order}, name COLLATE "C" ${order}
        LIMIT ${query.size} OFFSET ${offsetOf(query)}`),
      this.db.execute<{ total: number }>(sql`SELECT count(DISTINCT name)::int AS total FROM (${segments}) AS level`).then(it => it.rows),
    ]);
    return { rows: rows.rows.map(it => ({ name: it.name, isKey: it.is_key, children: it.children })), total };
  }

  /** Every label the space's translations carry, in byte order. */
  async findLabels(spaceId: string): Promise<string[]> {
    const result = await this.db.execute<{ label: string }>(sql`
      SELECT label FROM (SELECT DISTINCT unnest(${translations.labels}) AS label FROM ${translations} WHERE ${translations.spaceId} = ${spaceId}) AS labels
      ORDER BY label COLLATE "C"`);
    return result.rows.map(it => it.label);
  }

  findByKeys(spaceId: string, keys: string[]): Promise<TranslationEntity[]> {
    if (!keys.length) return Promise.resolve([]);
    return this.db.query.translations.findMany({ where: this.byKeys(spaceId, keys) });
  }

  findOne(spaceId: string, id: string): Promise<TranslationEntity | undefined> {
    return this.db.query.translations.findFirst({ where: this.byId(spaceId, id) });
  }

  /** Answers the new translation's id. */
  async create(spaceId: string, values: NewTranslation, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await this.write(spaceId, tx, async t => {
      await t.insert(translations).values({ id, spaceId, ...values });
      return { result: undefined, changed: [{ id, op: 'created' }] };
    });
    return id;
  }

  /** The translation is checked by the service; the change event only when a row changed. */
  update(spaceId: string, id: string, values: TranslationUpdate, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const changed = await t.update(translations).set(values).where(this.byId(spaceId, id)).returning({ id: translations.id });
      return { result: undefined, changed: changed.length ? [{ id, op: 'updated' }] : [] };
    });
  }

  /** One locale's value; an empty `value` removes it. The translation is checked by the service. */
  updateLocale(spaceId: string, id: string, locale: string, value: string, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const changed = await t
        .update(translations)
        .set({ locales: this.localeValue(locale, value) })
        .where(this.byId(spaceId, id))
        .returning({ id: translations.id });
      return { result: undefined, changed: changed.length ? [{ id, op: 'updated' }] : [] };
    });
  }

  /** One locale's value of several translations (by id), e.g. machine translations. */
  updateLocaleValues(spaceId: string, locale: string, values: { id: string; value: string }[], tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      for (const { id, value } of values) {
        await t
          .update(translations)
          .set({ locales: this.localeValue(locale, value) })
          .where(this.byId(spaceId, id));
      }
      return { result: undefined, changed: values.map(it => ({ id: it.id, op: 'updated' as const })) };
    });
  }

  /** The event only when a row went (deleted meanwhile: nothing to announce). */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const deleted = await t.delete(translations).where(this.byId(spaceId, id)).returning({ id: translations.id });
      return { result: undefined, changed: deleted.length ? [{ id, op: 'deleted' }] : [] };
    });
  }

  deleteAll(spaceId: string, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      await t.delete(translations).where(eq(translations.spaceId, spaceId));
      return { result: undefined, changed: [{ op: 'deleted' }] };
    });
  }

  // The CLI push (`POST /api/v1/spaces/:s/translations/:locale`) addresses translations by key.

  /** New translations with a value for `locale`. */
  insertKeys(spaceId: string, locale: string, values: Record<string, string>, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      await t.insert(translations).values(
        Object.entries(values).map(([key, value]) => ({
          id: newUuid(),
          spaceId,
          key,
          locales: { [locale]: value },
        })),
      );
      return { result: undefined, changed: [{ op: 'updated' }] };
    });
  }

  updateLocaleByKeys(spaceId: string, locale: string, values: Record<string, string>, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      for (const [key, value] of Object.entries(values)) {
        await t
          .update(translations)
          .set({ locales: this.localeValue(locale, value) })
          .where(this.byKeys(spaceId, [key]));
      }
      return { result: undefined, changed: [{ op: 'updated' }] };
    });
  }

  deleteLocaleByKeys(spaceId: string, locale: string, keys: string[], tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      await t
        .update(translations)
        .set({ locales: this.localeValue(locale, '') })
        .where(this.byKeys(spaceId, keys));
      return { result: undefined, changed: [{ op: 'updated' }] };
    });
  }

  deleteByKeys(spaceId: string, keys: string[], tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      await t.delete(translations).where(this.byKeys(spaceId, keys));
      return { result: undefined, changed: [{ op: 'updated' }] };
    });
  }

  private async write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<{ result: T; changed: Change[] }>,
  ): Promise<T> {
    try {
      return await transaction(this.db, tx, async t => {
        const { result, changed } = await work(t);
        if (changed.length) {
          await dropTranslationDrafts(t, spaceId);
          for (const it of changed) await this.eventService.publish({ spaceId, entity: 'translations', ...it }, t);
        }
        return result;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('A translation with this key already exists');
      throw error;
    }
  }

  /** The `locales` value with `locale` set to `value`, or removed when `value` is empty. */
  private localeValue(locale: string, value: string) {
    return value
      ? sql`jsonb_set(${translations.locales}, ${`{${locale}}`}::text[], ${JSON.stringify(value)}::jsonb)`
      : sql`${translations.locales} - ${locale}::text`;
  }

  /**
   * The filter of both views. `status` counts the space's locales with a value (`localeIds`): all of them, some, none;
   * `localeStatus` asks for a non-blank value in `locale`.
   */
  private where(spaceId: string, query: TranslationFilter, localeIds: string[]): SQL | undefined {
    const conditions: SQL[] = [eq(translations.spaceId, spaceId)];
    const valueIn = (locale: string) => sql`(${translations.locales} ->> ${locale})`;
    // The key in any letter case: the add and rename dialogs refuse a key that differs only in case.
    if (query.key) conditions.push(sql`lower(${translations.key}) = lower(${query.key})`);
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(
        (query.locale
          ? or(ilike(translations.key, pattern), sql`${valueIn(query.locale)} ILIKE ${pattern}`)
          : ilike(translations.key, pattern)) as SQL,
      );
    }
    if (query.label?.length) conditions.push(arrayOverlaps(translations.labels, query.label));
    if (query.status?.length) {
      const filled = localeIds.length
        ? sql.join(
            localeIds.map(id => sql`(coalesce(${valueIn(id)}, '') <> '')::int`),
            sql` + `,
          )
        : sql`0`;
      const all = localeIds.length;
      const states = query.status.map(status =>
        status === 'TRANSLATED'
          ? sql`(${filled}) = ${all} AND ${all} > 0`
          : status === 'UNTRANSLATED'
            ? sql`(${filled}) = 0`
            : sql`(${filled}) BETWEEN 1 AND ${all - 1}`,
      );
      conditions.push(or(...states) as SQL);
    }
    if (query.localeStatus?.length && query.locale) {
      const blank = sql`btrim(coalesce(${valueIn(query.locale)}, '')) = ''`;
      if (query.localeStatus.length === 1) conditions.push(query.localeStatus[0] === 'UNTRANSLATED' ? blank : sql`NOT ${blank}`);
    }
    return and(...conditions);
  }

  private byId(spaceId: string, id: string) {
    return and(eq(translations.spaceId, spaceId), eq(translations.id, id));
  }

  private byKeys(spaceId: string, keys: string[]) {
    return and(eq(translations.spaceId, spaceId), inArray(translations.key, keys));
  }
}
