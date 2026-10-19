import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { translations } from '../../../infra/database/schema.js';
import { isUniqueViolation, transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropTranslationDrafts } from '../../../shared/data-rules/translation-drafts.js';

export type TranslationEntity = typeof translations.$inferSelect;
export type NewTranslation = Pick<TranslationEntity, 'key' | 'locales' | 'labels' | 'description'>;
export type TranslationUpdate = Partial<Pick<TranslationEntity, 'key' | 'labels' | 'description'>>;

type Change = { id?: string; op: 'created' | 'updated' | 'deleted' };

/**
 * The `translations` rows of a space. Every write, in one transaction: the change, the space's draft maps dropped (the
 * next draft request builds them, under a new cv) and a `translations` change event per changed row. A key already
 * taken in the space is a `ConflictException`.
 */
@Injectable()
export class TranslationRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventService,
  ) {}

  /** For the app: by key, in the database collation. */
  findAll(spaceId: string): Promise<TranslationEntity[]> {
    return this.db.select().from(translations).where(eq(translations.spaceId, spaceId)).orderBy(asc(translations.key));
  }

  /** For the public API and export files: by key in byte order, as Firestore returned documents. */
  findAllInByteOrder(spaceId: string): Promise<TranslationEntity[]> {
    return this.db
      .select()
      .from(translations)
      .where(eq(translations.spaceId, spaceId))
      .orderBy(asc(sql`${translations.key} collate "C"`));
  }

  findByKeys(spaceId: string, keys: string[]): Promise<TranslationEntity[]> {
    if (!keys.length) return Promise.resolve([]);
    return this.db.select().from(translations).where(this.byKeys(spaceId, keys));
  }

  async findById(spaceId: string, id: string): Promise<TranslationEntity | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await this.db.select().from(translations).where(this.byId(spaceId, id));
    return row;
  }

  async count(spaceId: string): Promise<number> {
    const [{ value }] = await this.db.select({ value: count() }).from(translations).where(eq(translations.spaceId, spaceId));
    return Number(value);
  }

  create(spaceId: string, values: NewTranslation, tx?: Transaction): Promise<TranslationEntity> {
    return this.write(spaceId, tx, async t => {
      const [row] = await t
        .insert(translations)
        .values({ id: newUuid(), spaceId, ...values })
        .returning();
      return { result: row, changed: [{ id: row.id, op: 'created' }] };
    });
  }

  /** `undefined` when the space has no translation `id`. */
  update(spaceId: string, id: string, values: TranslationUpdate, tx?: Transaction): Promise<TranslationEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const [row] = await t.update(translations).set(values).where(this.byId(spaceId, id)).returning();
      return { result: row, changed: row ? [{ id, op: 'updated' }] : [] };
    });
  }

  /** One locale's value; an empty `value` removes it. `undefined` when the space has no translation `id`. */
  setLocale(
    spaceId: string,
    id: string,
    locale: string,
    value: string,
    tx?: Transaction,
  ): Promise<TranslationEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const [row] = await t
        .update(translations)
        .set({ locales: this.localeValue(locale, value) })
        .where(this.byId(spaceId, id))
        .returning();
      return { result: row, changed: row ? [{ id, op: 'updated' }] : [] };
    });
  }

  /** One locale's value of several translations (by id), e.g. machine translations. */
  setLocaleValues(
    spaceId: string,
    locale: string,
    values: { id: string; value: string }[],
    tx?: Transaction,
  ): Promise<void> {
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

  /** Whether the space had translation `id`. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<boolean> {
    return this.write(spaceId, tx, async t => {
      const deleted = await t.delete(translations).where(this.byId(spaceId, id)).returning({ id: translations.id });
      return { result: deleted.length > 0, changed: deleted.length ? [{ id, op: 'deleted' }] : [] };
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
  addKeys(spaceId: string, locale: string, values: Record<string, string>, tx?: Transaction): Promise<void> {
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

  setLocaleByKeys(spaceId: string, locale: string, values: Record<string, string>, tx?: Transaction): Promise<void> {
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

  removeLocaleByKeys(spaceId: string, locale: string, keys: string[], tx?: Transaction): Promise<void> {
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
          for (const it of changed) await this.events.publish({ spaceId, entity: 'translations', ...it }, t);
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

  private byId(spaceId: string, id: string) {
    return and(eq(translations.spaceId, spaceId), eq(translations.id, id));
  }

  private byKeys(spaceId: string, keys: string[]) {
    return and(eq(translations.spaceId, spaceId), inArray(translations.key, keys));
  }
}
