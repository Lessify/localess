import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, max, sql } from 'drizzle-orm';
import { DEFAULT_LOCALE, type SpaceOverview } from '@localess/shared';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import {
  assets,
  contents,
  locales,
  schemas,
  spaceEnvironments,
  spaceLocales,
  spaces,
  translations,
} from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { toDto } from '../../infra/http/dto.js';
import { requireSpace, selectSpaces, SpaceRow } from '../../infra/http/space-access.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** `Space` as the SPA reads it; the cache versions are an API-internal detail, the default locale comes as `defaultLocale`. */
export const spaceDto = (space: SpaceRow) => toDto(space, ['contentVersion', 'translationVersion', 'defaultLocaleId']);

@Injectable()
export class SpacesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly events: EventsService,
  ) {}

  /** By name, case-insensitive whatever the database collation; the id keeps equal names in a stable order. */
  async list(): Promise<SpaceRow[]> {
    return selectSpaces(this.db).orderBy(asc(sql`lower(${spaces.name})`), asc(spaces.id));
  }

  /** The space, or undefined (the public API answers 404 itself; `get` throws). */
  async findSpace(spaceId: string): Promise<SpaceRow | undefined> {
    if (!isUuid(spaceId)) return undefined;
    const [space] = await selectSpaces(this.db).where(eq(spaces.id, spaceId));
    return space;
  }

  get(spaceId: string): Promise<SpaceRow> {
    return requireSpace(this.db, spaceId);
  }

  async create(name: string): Promise<SpaceRow> {
    return this.db.transaction(async tx => {
      const id = newUuid();
      await tx.insert(spaces).values({ id, name, defaultLocaleId: DEFAULT_LOCALE.id });
      await tx.insert(spaceLocales).values({ spaceId: id, localeId: DEFAULT_LOCALE.id, position: 0 });
      await this.events.publish({ spaceId: null, entity: 'spaces', id, op: 'created' }, tx);
      return requireSpace(tx, id);
    });
  }

  /**
   * Runs `change` on the space inside a transaction (it may write `spaces` and `space_locales`), touches
   * `updated_at` and announces it.
   */
  private async update(
    spaceId: string,
    change: (space: SpaceRow, tx: Transaction) => Promise<Partial<typeof spaces.$inferInsert> | void>,
  ): Promise<SpaceRow> {
    return this.db.transaction(async tx => {
      const space = await requireSpace(tx, spaceId);
      const values = (await change(space, tx)) ?? {};
      await tx
        .update(spaces)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(spaces.id, spaceId));
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' }, tx);
      return requireSpace(tx, spaceId);
    });
  }

  rename(spaceId: string, name: string): Promise<SpaceRow> {
    return this.update(spaceId, async () => ({ name }));
  }

  /** Adds a Visual Editor environment at the end of the space's list. */
  createEnvironment(spaceId: string, environment: { name: string; url: string }): Promise<SpaceRow> {
    return this.update(spaceId, async (_, tx) => {
      const [{ last }] = await tx
        .select({ last: max(spaceEnvironments.position) })
        .from(spaceEnvironments)
        .where(eq(spaceEnvironments.spaceId, spaceId));
      await tx.insert(spaceEnvironments).values({ id: newUuid(), spaceId, ...environment, position: (last ?? -1) + 1 });
    });
  }

  updateEnvironment(spaceId: string, environmentId: string, environment: { name: string; url: string }): Promise<SpaceRow> {
    return this.update(spaceId, async (_, tx) => {
      const [updated] = await tx
        .update(spaceEnvironments)
        .set({ ...environment, updatedAt: new Date() })
        .where(this.environment(spaceId, environmentId))
        .returning({ id: spaceEnvironments.id });
      if (!updated) throw new NotFoundException('Environment not found');
    });
  }

  deleteEnvironment(spaceId: string, environmentId: string): Promise<SpaceRow> {
    return this.update(spaceId, async (_, tx) => {
      const [deleted] = await tx
        .delete(spaceEnvironments)
        .where(this.environment(spaceId, environmentId))
        .returning({ id: spaceEnvironments.id });
      if (!deleted) throw new NotFoundException('Environment not found');
    });
  }

  /** `environmentIds` is the space's environments in their new order: every one of them, each once. */
  reorderEnvironments(spaceId: string, environmentIds: string[]): Promise<SpaceRow> {
    return this.update(spaceId, async (space, tx) => {
      const current = new Set(space.environments.map(it => it.id));
      if (
        environmentIds.length !== current.size ||
        new Set(environmentIds).size !== environmentIds.length ||
        environmentIds.some(id => !current.has(id))
      ) {
        throw new BadRequestException("The new order must list each of the space's environments once");
      }
      for (const [position, id] of environmentIds.entries()) {
        await tx.update(spaceEnvironments).set({ position }).where(this.environment(spaceId, id));
      }
    });
  }

  private environment(spaceId: string, environmentId: string) {
    return and(eq(spaceEnvironments.spaceId, spaceId), eq(spaceEnvironments.id, environmentId));
  }

  /** Adds a locale from `locales` at the end of the space's list (no-op when it is already there, like `arrayUnion`). */
  addLocale(spaceId: string, localeId: string): Promise<SpaceRow> {
    return this.update(spaceId, async (space, tx) => {
      if (space.locales.some(it => it.id === localeId)) return;
      const [known] = await tx.select({ id: locales.id }).from(locales).where(eq(locales.id, localeId));
      if (!known) throw new BadRequestException(`Unknown locale ${localeId}`);
      const [{ last }] = await tx
        .select({ last: max(spaceLocales.position) })
        .from(spaceLocales)
        .where(eq(spaceLocales.spaceId, spaceId));
      await tx.insert(spaceLocales).values({ spaceId, localeId, position: (last ?? -1) + 1 });
    });
  }

  removeLocale(spaceId: string, localeId: string): Promise<SpaceRow> {
    return this.update(spaceId, async (space, tx) => {
      if (space.defaultLocaleId === localeId) {
        throw new BadRequestException('The default locale cannot be removed; make another locale the default first');
      }
      await tx.delete(spaceLocales).where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
    });
  }

  /** `localeIds` is the space's locales in their new order: every one of them, each once. */
  reorderLocales(spaceId: string, localeIds: string[]): Promise<SpaceRow> {
    return this.update(spaceId, async (space, tx) => {
      const current = new Set(space.locales.map(it => it.id));
      if (localeIds.length !== current.size || new Set(localeIds).size !== localeIds.length || localeIds.some(id => !current.has(id))) {
        throw new BadRequestException("The new order must list each of the space's locales once");
      }
      for (const [position, localeId] of localeIds.entries()) {
        await tx
          .update(spaceLocales)
          .set({ position })
          .where(and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      }
    });
  }

  setDefaultLocale(spaceId: string, localeId: string): Promise<SpaceRow> {
    return this.update(spaceId, async space => {
      if (!space.locales.some(it => it.id === localeId)) throw new BadRequestException(`Locale ${localeId} is not in space locales`);
      return { defaultLocaleId: localeId };
    });
  }

  /** Everything in the space goes with it: rows by FK cascade, files by prefix. */
  async delete(spaceId: string): Promise<void> {
    await this.db.transaction(async tx => {
      const space = await requireSpace(tx, spaceId);
      if (space.importStatus === 'IMPORTING') throw new ConflictException('The space is being imported');
      await tx.delete(spaces).where(eq(spaces.id, spaceId));
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'deleted' }, tx);
    });
    await this.storage.deletePrefix(`spaces/${spaceId}/`);
  }

  /**
   * Dashboard numbers, computed on request (were stored on the space by the `space-calculateoverview` callable).
   * Assets and contents count files and documents only; asset storage is the sum of `assets.size`, so files without
   * a recorded size (imported without their file) are counted apart. Progress uses the current values, the rule of
   * delivery: a non-empty value is translated.
   */
  async overview(spaceId: string): Promise<SpaceOverview> {
    const space = await requireSpace(this.db, spaceId);
    const countOf = async (query: Promise<{ value: number }[]>) => Number((await query)[0]?.value ?? 0);
    const [translationsCount, contentsCount, schemasCount, assetStats, progress] = await Promise.all([
      countOf(this.db.select({ value: count() }).from(translations).where(eq(translations.spaceId, spaceId))),
      countOf(
        this.db
          .select({ value: count() })
          .from(contents)
          .where(and(eq(contents.spaceId, spaceId), eq(contents.kind, 'DOCUMENT'))),
      ),
      countOf(this.db.select({ value: count() }).from(schemas).where(eq(schemas.spaceId, spaceId))),
      this.db
        .select({
          files: count(),
          size: sql<string | null>`sum(${assets.size})`,
          withoutSize: sql<number>`count(*) filter (where ${assets.size} is null)`,
        })
        .from(assets)
        .where(and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FILE'))),
      this.db
        .select({
          id: spaceLocales.localeId,
          translated: sql<number>`count(${translations.id}) filter (where coalesce(${translations.locales} ->> ${spaceLocales.localeId}, '') <> '')`,
        })
        .from(spaceLocales)
        .leftJoin(translations, eq(translations.spaceId, spaceLocales.spaceId))
        .where(eq(spaceLocales.spaceId, spaceId))
        .groupBy(spaceLocales.localeId),
    ]);
    const translatedBy = new Map(progress.map(it => [it.id, Number(it.translated)]));
    return {
      counts: {
        locales: space.locales.length,
        translations: translationsCount,
        assets: Number(assetStats[0]?.files ?? 0),
        contents: contentsCount,
        schemas: schemasCount,
      },
      storage: { assets: Number(assetStats[0]?.size ?? 0), assetsWithoutSize: Number(assetStats[0]?.withoutSize ?? 0) },
      progress: {
        total: translationsCount,
        locales: space.locales.map(locale => ({ ...locale, translated: translatedBy.get(locale.id) ?? 0 })),
      },
    };
  }
}
