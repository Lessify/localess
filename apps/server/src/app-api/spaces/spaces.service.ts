import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql, sum } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module.js';
import { newId } from '../../database/id.js';
import {
  assets,
  contentPublished,
  contents,
  Locale,
  schemas,
  spaces,
  tasks,
  translationPublished,
  translations,
} from '../../database/schema.js';
import { DEFAULT_LOCALE } from '../../domain/models/space.model.js';
import { EventsService } from '../../events/events.service.js';
import { STORAGE_DRIVER, StorageDriver } from '../../storage/storage.driver.js';
import { toDto } from '../common/dto.js';
import { requireSpace, SpaceRow } from '../common/space-access.js';

/** `Space` as the SPA reads it; the cache versions are an API-internal detail. */
export const spaceDto = (space: SpaceRow) => toDto(space, ['contentVersion', 'translationVersion']);

@Injectable()
export class SpacesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly events: EventsService,
  ) {}

  async list(): Promise<SpaceRow[]> {
    return this.db.select().from(spaces).orderBy(asc(spaces.name));
  }

  get(spaceId: string): Promise<SpaceRow> {
    return requireSpace(this.db, spaceId);
  }

  async create(name: string): Promise<SpaceRow> {
    return this.db.transaction(async tx => {
      const [space] = await tx
        .insert(spaces)
        .values({ id: newId(), name, locales: [DEFAULT_LOCALE], localeFallback: DEFAULT_LOCALE })
        .returning();
      await this.events.publish({ spaceId: null, entity: 'spaces', id: space.id, op: 'created' }, tx);
      return space;
    });
  }

  /** Applies `change` to the space row inside a transaction and announces it. */
  private async update(spaceId: string, change: (space: SpaceRow) => Partial<typeof spaces.$inferInsert>): Promise<SpaceRow> {
    return this.db.transaction(async tx => {
      const space = await requireSpace(tx, spaceId);
      const [updated] = await tx
        .update(spaces)
        .set({ ...change(space), updatedAt: new Date() })
        .where(eq(spaces.id, spaceId))
        .returning();
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' }, tx);
      return updated;
    });
  }

  rename(spaceId: string, name: string): Promise<SpaceRow> {
    return this.update(spaceId, () => ({ name }));
  }

  updateEnvironments(spaceId: string, environments: { name: string; url: string }[]): Promise<SpaceRow> {
    return this.update(spaceId, () => ({ environments }));
  }

  /** Adds a locale (no-op when it is already there, like `arrayUnion`). */
  addLocale(spaceId: string, locale: Locale): Promise<SpaceRow> {
    return this.update(spaceId, space => ({
      locales: space.locales.some(it => it.id === locale.id) ? space.locales : [...space.locales, locale],
    }));
  }

  removeLocale(spaceId: string, localeId: string): Promise<SpaceRow> {
    return this.update(spaceId, space => {
      if (space.localeFallback.id === localeId) {
        throw new BadRequestException('The fallback locale cannot be removed; mark another locale as fallback first');
      }
      return { locales: space.locales.filter(it => it.id !== localeId) };
    });
  }

  markFallback(spaceId: string, localeId: string): Promise<SpaceRow> {
    return this.update(spaceId, space => {
      const locale = space.locales.find(it => it.id === localeId);
      if (!locale) throw new BadRequestException(`Locale ${localeId} is not in space locales`);
      return { localeFallback: locale };
    });
  }

  /** Everything in the space goes with it: rows by FK cascade, files by prefix. */
  async delete(spaceId: string): Promise<void> {
    await this.db.transaction(async tx => {
      await requireSpace(tx, spaceId);
      await tx.delete(spaces).where(eq(spaces.id, spaceId));
      await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'deleted' }, tx);
    });
    await this.storage.deletePrefix(`spaces/${spaceId}/`);
  }

  /** Dashboard numbers (was the `space-calculateoverview` callable), stored on the space. */
  async calculateOverview(spaceId: string): Promise<SpaceRow> {
    await requireSpace(this.db, spaceId);
    const countOf = async (query: Promise<{ value: number }[]>) => Number((await query)[0]?.value ?? 0);
    const [translationsCount, assetsCount, contentsCount, schemasCount, tasksCount] = await Promise.all([
      countOf(this.db.select({ value: count() }).from(translations).where(eq(translations.spaceId, spaceId))),
      countOf(
        this.db
          .select({ value: count() })
          .from(assets)
          .where(and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FILE'))),
      ),
      countOf(
        this.db
          .select({ value: count() })
          .from(contents)
          .where(and(eq(contents.spaceId, spaceId), eq(contents.kind, 'DOCUMENT'))),
      ),
      countOf(this.db.select({ value: count() }).from(schemas).where(eq(schemas.spaceId, spaceId))),
      countOf(this.db.select({ value: count() }).from(tasks).where(eq(tasks.spaceId, spaceId))),
    ]);
    // Sizes of what used to be Storage JSON files are now the size of the JSON in Postgres.
    const jsonSize = async (query: Promise<{ value: string | null }[]>) => Number((await query)[0]?.value ?? 0);
    const [translationsSize, contentsSize, assetsSize, tasksSize] = await Promise.all([
      jsonSize(
        this.db
          .select({ value: sum(sql`octet_length(${translationPublished.data}::text)`) })
          .from(translationPublished)
          .where(eq(translationPublished.spaceId, spaceId)),
      ),
      jsonSize(
        this.db
          .select({ value: sum(sql`octet_length(${contentPublished.data}::text)`) })
          .from(contentPublished)
          .where(eq(contentPublished.spaceId, spaceId)),
      ),
      this.storage.sizeOfPrefix(`spaces/${spaceId}/assets/`),
      this.storage.sizeOfPrefix(`spaces/${spaceId}/tasks/`),
    ]);
    const overview = {
      translationsCount,
      translationsSize,
      assetsCount,
      assetsSize,
      contentsCount,
      contentsSize,
      tasksCount,
      tasksSize,
      schemasCount,
      totalSize: translationsSize + assetsSize + contentsSize + tasksSize,
      updatedAt: new Date().toISOString(),
    };
    const [updated] = await this.db.update(spaces).set({ overview }).where(eq(spaces.id, spaceId)).returning();
    await this.events.publish({ spaceId: null, entity: 'spaces', id: spaceId, op: 'updated' });
    return updated;
  }
}
