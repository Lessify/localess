import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { SpacePageable } from '@localess/shared';
import { and, asc, desc, eq, ilike, inArray, notExists, or, sql, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { firebaseImports, spaceLocales, spaces } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropContentDrafts } from '../../../shared/data-rules/content-snapshots.js';
import { scheduleSpaceFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import { dropTranslationDrafts } from '../../../shared/data-rules/translation-drafts.js';
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
  findAllCount(query: SpacePageable): Promise<number> {
    return this.db.$count(spaces, this.where(query));
  }

  /** Every space that can be opened (not importing, no failed import), by name: the sidebar list. */
  findAllNames(): Promise<Pick<SpaceEntity, 'id' | 'name'>[]> {
    return this.db.query.spaces.findMany({
      columns: { id: true, name: true },
      where: this.openable(),
      orderBy: [asc(sql`lower(${spaces.name})`), asc(spaces.id)],
    });
  }

  /** Whether the space is there (a check that needs nothing of it). */
  async exists(spaceId: string): Promise<boolean> {
    return (await this.db.$count(spaces, eq(spaces.id, spaceId))) > 0;
  }

  /** The space with its default locale and its locales (each with its locale), in position order. */
  findOne(spaceId: string): Promise<SpaceWithLocales | undefined> {
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
    return (await this.db.$count(firebaseImports, and(eq(firebaseImports.spaceId, spaceId), eq(firebaseImports.status, 'RUNNING')))) > 0;
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

  /**
   * Draft translation maps fill gaps from the default locale and content drafts read it from the bare fields, so both
   * go; published ones keep what their publish built.
   */
  setDefaultLocale(spaceId: string, localeId: string, tx?: Transaction): Promise<void> {
    return changeSpace(this.db, this.eventService, spaceId, tx, async t => {
      // 409: removed after the service checked (the database does not hold the default to the space's locales).
      const listed = await t.$count(spaceLocales, and(eq(spaceLocales.spaceId, spaceId), eq(spaceLocales.localeId, localeId)));
      if (!listed) throw new ConflictException(`Locale ${localeId} is not in space locales`);
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
