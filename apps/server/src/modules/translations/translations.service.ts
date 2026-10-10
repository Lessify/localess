import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';
import { WebHookEvent } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { spaces, translationPublished, translations } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { buildTranslationMap } from './translation-delivery.service.js';
import { TranslateService } from './translate/translate.service.js';
import type { UserRow } from '../../auth/users/users.service.js';
import { WebhookDispatcher } from '../webhooks/webhook-dispatcher.service.js';
import { updatedByOf } from '../contents/contents.service.js';
import { bumpVersion, requireSpace, SpaceRow } from '../../infra/http/space-access.js';

export type TranslationRow = typeof translations.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Values are written only for the space's locales (removing one is allowed for any locale). */
function requireSpaceLocales(space: Pick<SpaceRow, 'locales'>, localeIds: string[]): void {
  const unknown = localeIds.filter(id => !space.locales.some(it => it.id === id));
  if (unknown.length) throw new BadRequestException(`Not in space locales: ${unknown.join(', ')}`);
}

const isUniqueViolation = (error: unknown) =>
  (error as { cause?: { code?: string } })?.cause?.code === '23505' || (error as { code?: string })?.code === '23505';

/**
 * Translation keys of a space. Routes use the UUID `id`; `key` is the translation key, unique per space. Every write bumps the translation version and fires
 * `translation.changed` after commit — what the SPA's `translation-publishdraft` call after each
 * write used to do (draft translations are now built from these rows on read).
 */
@Injectable()
export class TranslationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
    private readonly webhooks: WebhookDispatcher,
    private readonly translate: TranslateService,
  ) {}

  list(spaceId: string): Promise<TranslationRow[]> {
    return this.db.select().from(translations).where(eq(translations.spaceId, spaceId)).orderBy(asc(translations.key));
  }

  async count(spaceId: string): Promise<number> {
    const [{ value }] = await this.db.select({ value: count() }).from(translations).where(eq(translations.spaceId, spaceId));
    return Number(value);
  }

  async get(spaceId: string, id: string): Promise<TranslationRow> {
    if (!isUuid(id)) throw new NotFoundException('Translation not found');
    const [row] = await this.db
      .select()
      .from(translations)
      .where(and(eq(translations.spaceId, spaceId), eq(translations.id, id)));
    if (!row) throw new NotFoundException('Translation not found');
    return row;
  }

  private async write<T>(
    spaceId: string,
    work: (tx: Transaction, space: SpaceRow) => Promise<{ result: T; changed: { id?: string; op: 'created' | 'updated' | 'deleted' }[] }>,
  ): Promise<T> {
    let result: T;
    try {
      result = await this.db.transaction(async tx => {
        const space = await requireSpace(tx, spaceId);
        const outcome = await work(tx, space);
        await bumpVersion(tx, spaceId, 'translation');
        for (const it of outcome.changed) await this.events.publish({ spaceId, entity: 'translations', ...it }, tx);
        return outcome.result;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('A translation with this key already exists');
      throw error;
    }
    this.webhooks.dispatch(spaceId, WebHookEvent.TRANSLATION_CHANGED);
    return result;
  }

  private where(spaceId: string, id: string) {
    return and(eq(translations.spaceId, spaceId), eq(translations.id, id));
  }

  create(
    spaceId: string,
    input: { key: string; type: string; locales: Record<string, string>; labels?: string[]; description?: string },
    user: UserRow,
  ): Promise<TranslationRow> {
    return this.write(spaceId, async (tx, space) => {
      requireSpaceLocales(space, Object.keys(input.locales));
      const [row] = await tx
        .insert(translations)
        .values({
          id: newUuid(),
          spaceId,
          ...input,
          labels: input.labels?.length ? input.labels : null,
          description: input.description || null,
          updatedBy: updatedByOf(user),
        })
        .returning();
      return { result: row, changed: [{ id: row.id, op: 'created' }] };
    });
  }

  update(spaceId: string, id: string, input: { labels?: string[]; description?: string }, user: UserRow): Promise<TranslationRow> {
    return this.write(spaceId, async tx => {
      const [row] = await tx
        .update(translations)
        .set({
          labels: input.labels?.length ? input.labels : null,
          description: input.description || null,
          updatedBy: updatedByOf(user),
          updatedAt: new Date(),
        })
        .where(this.where(spaceId, id))
        .returning();
      if (!row) throw new NotFoundException('Translation not found');
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  /** One locale's value, for a locale of the space; an empty string removes it (for any locale: leftovers of a removed locale). */
  updateLocale(spaceId: string, id: string, locale: string, value: string, user: UserRow): Promise<TranslationRow> {
    return this.write(spaceId, async (tx, space) => {
      if (value) requireSpaceLocales(space, [locale]);
      const locales = value
        ? sql`jsonb_set(${translations.locales}, ${`{${locale}}`}::text[], ${JSON.stringify(value)}::jsonb)`
        : sql`${translations.locales} - ${locale}::text`;
      const [row] = await tx
        .update(translations)
        .set({ locales, updatedBy: updatedByOf(user), updatedAt: new Date() })
        .where(this.where(spaceId, id))
        .returning();
      if (!row) throw new NotFoundException('Translation not found');
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  /** Changes the key; the id stays. */
  rename(spaceId: string, id: string, key: string, user: UserRow): Promise<TranslationRow> {
    return this.write(spaceId, async tx => {
      const [row] = await tx
        .update(translations)
        .set({ key, updatedBy: updatedByOf(user), updatedAt: new Date() })
        .where(this.where(spaceId, id))
        .returning();
      if (!row) throw new NotFoundException('Translation not found');
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  delete(spaceId: string, id: string): Promise<void> {
    return this.write(spaceId, async tx => {
      const deleted = await tx.delete(translations).where(this.where(spaceId, id)).returning({ id: translations.id });
      if (!deleted.length) throw new NotFoundException('Translation not found');
      return { result: undefined, changed: [{ id, op: 'deleted' }] };
    });
  }

  /** Removes every key (published files stay until the next publish, as before). */
  deleteAll(spaceId: string): Promise<void> {
    return this.write(spaceId, async tx => {
      await tx.delete(translations).where(eq(translations.spaceId, spaceId));
      return { result: undefined, changed: [{ op: 'deleted' }] };
    });
  }

  /**
   * Snapshot of every locale, filled from the default locale, plus per-locale progress (was the
   * `translation-publish` callable). Publishing an empty space is allowed and serves `{}`.
   */
  async publish(spaceId: string): Promise<void> {
    await this.db.transaction(async tx => {
      const space = await requireSpace(tx, spaceId);
      const rows = await tx
        .select({ key: translations.key, locales: translations.locales })
        .from(translations)
        .where(eq(translations.spaceId, spaceId))
        .orderBy(sql`${translations.key} collate "C"`);
      const progress: Record<string, number> = {};
      const publishedAt = new Date();
      for (const locale of space.locales) {
        const { values, translated } = buildTranslationMap(rows, locale.id, space.defaultLocaleId);
        progress[locale.id] = translated;
        await tx
          .insert(translationPublished)
          .values({ spaceId, locale: locale.id, data: values, publishedAt })
          .onConflictDoUpdate({ target: [translationPublished.spaceId, translationPublished.locale], set: { data: values, publishedAt } });
      }
      await tx
        .update(spaces)
        .set({ progress: { translations: progress } })
        .where(eq(spaces.id, spaceId));
      await bumpVersion(tx, spaceId, 'translation');
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' }, tx);
    });
    this.webhooks.dispatch(spaceId, WebHookEvent.TRANSLATION_PUBLISHED);
  }

  /**
   * Machine-translates every key that has a source value (and no target value, unless `overwrite`).
   * Returns how many keys were written; keys the provider failed on are left untouched.
   */
  async translateLocale(
    spaceId: string,
    sourceLocale: string,
    targetLocale: string,
    overwrite: boolean,
    user: UserRow,
  ): Promise<{ translated: number; failed: number }> {
    this.translate.requireProvider();
    requireSpaceLocales(await requireSpace(this.db, spaceId), [sourceLocale, targetLocale]);
    const candidates = (await this.list(spaceId)).filter(row => row.locales[sourceLocale] && (overwrite || !row.locales[targetLocale]));
    if (!candidates.length) return { translated: 0, failed: 0 };
    const result = await this.translate.translateItems(
      candidates.map(row => ({ id: row.id, content: row.locales[sourceLocale] })),
      sourceLocale,
      targetLocale,
    );
    const written = result.items.filter(it => it.content);
    if (written.length) {
      await this.write(spaceId, async tx => {
        for (const item of written) {
          await tx
            .update(translations)
            .set({
              locales: sql`jsonb_set(${translations.locales}, ${`{${targetLocale}}`}::text[], ${JSON.stringify(item.content)}::jsonb)`,
              updatedBy: updatedByOf(user),
              updatedAt: new Date(),
            })
            .where(and(eq(translations.spaceId, spaceId), inArray(translations.id, [item.id])));
        }
        return { result: undefined, changed: written.map(it => ({ id: it.id, op: 'updated' as const })) };
      });
    }
    return { translated: written.length, failed: result.failed.length };
  }
}
