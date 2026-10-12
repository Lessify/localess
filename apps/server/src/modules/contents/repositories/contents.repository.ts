import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, ne, notInArray, or, sql, SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { contentPublished, contents, keepUpdatedAt, schemas, type UpdatedBy } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { bumpContentVersion } from '../../../shared/data-rules/content-version.js';
import { requireSpace, type SpaceRow } from '../../../shared/queries/space.query.js';
import { buildDocumentStorage } from '../utils/content-extract.js';
import { joinSlug, startsWith } from '../utils/slug.utils.js';

export type ContentEntity = typeof contents.$inferSelect;

export interface ContentQuery {
  parentSlug?: string;
  kind?: 'FOLDER' | 'DOCUMENT';
  /** Case-insensitive name prefix. */
  name?: string;
  ids?: string[];
  limit?: number;
}

export interface NewContent {
  kind: 'FOLDER' | 'DOCUMENT';
  parentSlug: string;
  name: string;
  slug: string;
  schema?: string;
  data?: Record<string, unknown>;
  updatedBy: UpdatedBy;
}

export type ContentMove = { name?: string; slug?: string; parentSlug?: string; updatedBy: UpdatedBy };
export type ContentDataUpdate = {
  data: Record<string, unknown>;
  assets: string[];
  links: string[];
  references: string[];
  updatedBy: UpdatedBy;
};

interface WriteResult<T> {
  result: T;
  changed: { id: string; op: 'created' | 'updated' | 'deleted' }[];
}

/**
 * The `contents` rows of a space and their published snapshots (`content_published`). Every write, in one
 * transaction: the space checked (404 when gone), the change, the content version bumped (was `cache.json`) and a
 * `contents` change event per changed row. Folder renames cascade to descendants in one statement, deletes take the
 * subtree. The tree's integrity (an existing parent folder, a free full slug, no folder moved into itself, data only
 * on documents) is checked inside the write's transaction. Writes on a content id the space does not have answer
 * `undefined` and change nothing.
 */
@Injectable()
export class ContentsRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  findAll(spaceId: string, query: ContentQuery): Promise<ContentEntity[]> {
    const conditions: SQL[] = [eq(contents.spaceId, spaceId)];
    if (query.parentSlug !== undefined) conditions.push(eq(contents.parentSlug, query.parentSlug));
    if (query.kind) conditions.push(eq(contents.kind, query.kind));
    if (query.name) conditions.push(ilike(contents.name, startsWith(query.name)));
    if (query.ids) {
      const ids = query.ids.filter(isUuid);
      conditions.push(ids.length ? inArray(contents.id, ids) : sql`false`);
    }
    const select = this.db
      .select()
      .from(contents)
      .where(and(...conditions))
      .orderBy(desc(contents.kind), asc(contents.name));
    return query.limit ? select.limit(query.limit) : select;
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(contents)
      .where(kind ? and(eq(contents.spaceId, spaceId), eq(contents.kind, kind)) : eq(contents.spaceId, spaceId));
    return Number(value);
  }

  findById(spaceId: string, id: string): Promise<ContentEntity | undefined> {
    return this.find(this.db, spaceId, id);
  }

  create(spaceId: string, values: NewContent, tx?: Transaction): Promise<ContentEntity> {
    return this.write(spaceId, tx, async t => {
      const fullSlug = joinSlug(values.parentSlug, values.slug);
      await this.checkPlacement(t, spaceId, values.parentSlug, fullSlug);
      const [row] = await t
        .insert(contents)
        .values({
          id: newUuid(),
          spaceId,
          kind: values.kind,
          name: values.name,
          slug: values.slug,
          parentSlug: values.parentSlug,
          fullSlug,
          schema: values.kind === 'DOCUMENT' ? values.schema : null,
          data: values.kind === 'DOCUMENT' ? (values.data ?? null) : null,
          updatedBy: values.updatedBy,
        })
        .returning();
      return { result: row, changed: [{ id: row.id, op: 'created' }] };
    });
  }

  /**
   * Rename and/or move. A folder's new full slug is rewritten into every descendant in the same
   * transaction (the `content-onupdate` trigger used to cascade it level by level). `moved`: the full slug changed.
   */
  update(
    spaceId: string,
    id: string,
    values: ContentMove,
    tx?: Transaction,
  ): Promise<{ content: ContentEntity; moved: boolean } | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      const slug = values.slug ?? current.slug;
      const parentSlug = values.parentSlug ?? current.parentSlug;
      const fullSlug = joinSlug(parentSlug, slug);
      const moved = fullSlug !== current.fullSlug;
      if (moved) {
        if (current.kind === 'FOLDER' && (parentSlug === current.fullSlug || parentSlug.startsWith(`${current.fullSlug}/`))) {
          throw new BadRequestException('A folder cannot be moved into itself');
        }
        await this.checkPlacement(t, spaceId, parentSlug, fullSlug, id);
      }
      const [row] = await t
        .update(contents)
        .set({ name: values.name ?? current.name, slug, parentSlug, fullSlug, updatedBy: values.updatedBy })
        .where(this.byId(spaceId, id))
        .returning();
      const changed: { id: string; op: 'updated' }[] = [{ id, op: 'updated' }];
      if (moved && current.kind === 'FOLDER') {
        const old = current.fullSlug;
        const descendants = await t
          .update(contents)
          .set({
            fullSlug: sql`${fullSlug} || substr(${contents.fullSlug}, ${old.length + 1})`,
            parentSlug: sql`${fullSlug} || substr(${contents.parentSlug}, ${old.length + 1})`,
          })
          .where(
            and(eq(contents.spaceId, spaceId), or(eq(contents.parentSlug, old), sql`${contents.parentSlug} like ${startsWith(`${old}/`)}`)),
          )
          .returning({ id: contents.id });
        changed.push(...descendants.map(it => ({ id: it.id, op: 'updated' as const })));
      }
      return { result: { content: row, moved }, changed };
    });
  }

  /** Saves the editor's data and the ids it references (assets, links, references). */
  updateData(spaceId: string, id: string, values: ContentDataUpdate, tx?: Transaction): Promise<ContentEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (current.kind !== 'DOCUMENT') throw new BadRequestException('Only documents have data');
      const [row] = await t.update(contents).set(values).where(this.byId(spaceId, id)).returning();
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  /** Deletes the item and, for a folder, everything under it; answers what was deleted. Published snapshots cascade. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<{ id: string; fullSlug: string }[] | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      const subtree =
        current.kind === 'FOLDER'
          ? or(
              eq(contents.id, id),
              eq(contents.parentSlug, current.fullSlug),
              sql`${contents.parentSlug} like ${startsWith(`${current.fullSlug}/`)}`,
            )
          : eq(contents.id, id);
      const deleted = await t
        .delete(contents)
        .where(and(eq(contents.spaceId, spaceId), subtree))
        .returning({ id: contents.id, fullSlug: contents.fullSlug });
      return { result: deleted, changed: deleted.map(it => ({ id: it.id, op: 'deleted' as const })) };
    });
  }

  /**
   * Publish a document (one snapshot per space locale), or every document under a folder that changed
   * since it was last published. `updatedAt` is left alone so "changed since publish" keeps working.
   * Answers the published item.
   */
  publish(spaceId: string, id: string, tx?: Transaction): Promise<ContentEntity | undefined> {
    return this.write(spaceId, tx, async (t, space) => {
      const target = await this.find(t, spaceId, id);
      if (!target) return undefined;
      const documents =
        target.kind === 'DOCUMENT'
          ? [target]
          : (
              await t
                .select()
                .from(contents)
                .where(
                  and(
                    eq(contents.spaceId, spaceId),
                    eq(contents.kind, 'DOCUMENT'),
                    or(eq(contents.parentSlug, target.fullSlug), sql`${contents.parentSlug} like ${startsWith(`${target.fullSlug}/`)}`),
                  ),
                )
            ).filter(doc => !(doc.publishedAt && doc.publishedAt > doc.updatedAt));
      const schemaById = schemasByName(await t.select().from(schemas).where(eq(schemas.spaceId, spaceId)));
      const publishedAt = new Date();
      const localeIds = space.locales.map(it => it.id);
      for (const document of documents) {
        for (const locale of localeIds) {
          const data = buildDocumentStorage(document, schemaById, locale, publishedAt.toISOString()) as unknown as Record<string, unknown>;
          await t
            .insert(contentPublished)
            .values({ spaceId, contentId: document.id, locale, data, publishedAt })
            .onConflictDoUpdate({
              target: [contentPublished.spaceId, contentPublished.contentId, contentPublished.locale],
              set: { data, publishedAt },
            });
        }
        // Locales removed from the space since the last publish must stop being served.
        await t
          .delete(contentPublished)
          .where(
            and(
              eq(contentPublished.spaceId, spaceId),
              eq(contentPublished.contentId, document.id),
              notInArray(contentPublished.locale, localeIds),
            ),
          );
        await t
          .update(contents)
          .set({ publishedAt, ...keepUpdatedAt(contents) })
          .where(this.byId(spaceId, document.id));
      }
      return { result: target, changed: documents.map(it => ({ id: it.id, op: 'updated' as const })) };
    });
  }

  /** Stops serving a document (or every published document under a folder). Answers the unpublished item. */
  unpublish(spaceId: string, id: string, tx?: Transaction): Promise<ContentEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const target = await this.find(t, spaceId, id);
      if (!target) return undefined;
      const scope =
        target.kind === 'DOCUMENT'
          ? eq(contents.id, id)
          : and(
              eq(contents.kind, 'DOCUMENT'),
              or(eq(contents.parentSlug, target.fullSlug), sql`${contents.parentSlug} like ${startsWith(`${target.fullSlug}/`)}`),
            );
      const unpublished = await t
        .update(contents)
        .set({ publishedAt: null, ...keepUpdatedAt(contents) })
        .where(and(eq(contents.spaceId, spaceId), isNotNull(contents.publishedAt), scope))
        .returning({ id: contents.id });
      if (unpublished.length) {
        await t.delete(contentPublished).where(
          and(
            eq(contentPublished.spaceId, spaceId),
            inArray(
              contentPublished.contentId,
              unpublished.map(it => it.id),
            ),
          ),
        );
      }
      return { result: target, changed: unpublished.map(it => ({ id: it.id, op: 'updated' as const })) };
    });
  }

  /**
   * Runs `work` in the write's transaction (or the caller's), with the space checked first; then bumps the content
   * version and queues the change events. When `work` finds no content it answers `undefined` and nothing is bumped.
   */
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction, space: SpaceRow) => Promise<WriteResult<T>>,
  ): Promise<T>;
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction, space: SpaceRow) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined>;
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction, space: SpaceRow) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined> {
    return transaction(this.db, tx, async t => {
      const space = await requireSpace(t, spaceId);
      const outcome = await work(t, space);
      if (!outcome) return undefined;
      await bumpContentVersion(t, spaceId);
      for (const it of outcome.changed) await this.events.publish({ spaceId, entity: 'contents', ...it }, t);
      return outcome.result;
    });
  }

  /** The parent must be an existing folder ('' is the root), and the full slug must be free. */
  private async checkPlacement(t: Transaction, spaceId: string, parentSlug: string, fullSlug: string, selfId?: string): Promise<void> {
    if (parentSlug) {
      const [parent] = await t
        .select({ kind: contents.kind })
        .from(contents)
        .where(and(eq(contents.spaceId, spaceId), eq(contents.fullSlug, parentSlug)));
      if (parent?.kind !== 'FOLDER') throw new BadRequestException(`No folder at '${parentSlug}'`);
    }
    const [taken] = await t
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.fullSlug, fullSlug), ...(selfId ? [ne(contents.id, selfId)] : [])));
    if (taken) throw new ConflictException(`'${fullSlug}' is already used`);
  }

  private async find(executor: Pick<Database, 'select'>, spaceId: string, id: string): Promise<ContentEntity | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await executor.select().from(contents).where(this.byId(spaceId, id));
    return row;
  }

  private byId(spaceId: string, id: string) {
    return and(eq(contents.spaceId, spaceId), eq(contents.id, id));
  }
}
