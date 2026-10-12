import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, ne, or, sql, SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { contents, contentSnapshots, keepUpdatedAt, schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { dropContentDrafts, dropContentLinks } from '../../../shared/data-rules/content-snapshots.js';
import { requireSpace, type SpaceRow } from '../../../shared/queries/space.query.js';
import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
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
}

export type ContentMove = { name?: string; slug?: string; parentSlug?: string };
export type ContentDataUpdate = {
  data: Record<string, unknown>;
  assets: string[];
  links: string[];
  references: string[];
};

interface WriteResult<T> {
  result: T;
  changed: { id: string; op: 'created' | 'updated' | 'deleted' }[];
  /** `false` when the write leaves what drafts are built from as it was (publish, unpublish). */
  drafts?: boolean;
}

/**
 * The `contents` rows of a space and their published snapshots (`content_snapshots`). Every write, in one
 * transaction: the space checked (404 when gone), the change, the drafts of the changed documents and the `/links`
 * lists dropped (content-snapshots.ts) and a `contents` change event per changed row. Folder renames cascade to descendants in one statement, deletes take the
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

  /**
   * `undefined` when a document's schema is not a ROOT schema of the space. That schema row is locked (shared) until
   * the commit, so a rename or delete of it waits and then sees the new document, or runs first and this finds none.
   */
  create(spaceId: string, values: NewContent, tx?: Transaction): Promise<ContentEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      if (values.kind === 'DOCUMENT') {
        const [schema] = await t
          .select({ type: schemas.type })
          .from(schemas)
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.name, values.schema ?? '')))
          .for('share');
        if (schema?.type !== 'ROOT') return undefined;
      }
      const fullSlug = joinSlug(values.parentSlug, values.slug);
      await this.checkPlacement(t, spaceId, values.parentSlug, fullSlug);
      const [row] = await this.claimPath(fullSlug, () =>
        t.insert(contents).values({
          id: newUuid(),
          spaceId,
          kind: values.kind,
          name: values.name,
          slug: values.slug,
          parentSlug: values.parentSlug,
          fullSlug,
          schema: values.kind === 'DOCUMENT' ? values.schema : null,
          data: values.kind === 'DOCUMENT' ? (values.data ?? null) : null,
        }).returning(),
      );
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
      const [row] = await this.claimPath(fullSlug, () =>
        t.update(contents).set({ name: values.name ?? current.name, slug, parentSlug, fullSlug }).where(this.byId(spaceId, id)).returning(),
      );
      const changed: { id: string; op: 'updated' }[] = [{ id, op: 'updated' }];
      if (moved && current.kind === 'FOLDER') {
        const old = current.fullSlug;
        const descendants = await this.claimPath(fullSlug, () =>
          t
            .update(contents)
            .set({
              fullSlug: sql`${fullSlug} || substr(${contents.fullSlug}, ${old.length + 1})`,
              parentSlug: sql`${fullSlug} || substr(${contents.parentSlug}, ${old.length + 1})`,
            })
            .where(
              and(eq(contents.spaceId, spaceId), or(eq(contents.parentSlug, old), sql`${contents.parentSlug} like ${startsWith(`${old}/`)}`)),
            )
            .returning({ id: contents.id }),
        );
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

  /** Deletes the item and, for a folder, everything under it; answers what was deleted. Their snapshots cascade. */
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
   * Publish a document (one snapshot per space locale, all with the publish time as `built_at`, their `cv`), or every
   * document under a folder that changed since it was last published. `updatedAt` is left alone so "changed since
   * publish" keeps working. Answers the published item.
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
            .insert(contentSnapshots)
            .values({ spaceId, contentId: document.id, version: 'published', locale, data, builtAt: publishedAt })
            .onConflictDoUpdate({
              target: [contentSnapshots.spaceId, contentSnapshots.contentId, contentSnapshots.version, contentSnapshots.locale],
              set: { data, builtAt: publishedAt },
            });
        }
        await t
          .update(contents)
          .set({ publishedAt, ...keepUpdatedAt(contents) })
          .where(this.byId(spaceId, document.id));
      }
      return { result: target, changed: documents.map(it => ({ id: it.id, op: 'updated' as const })), drafts: false };
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
        await t.delete(contentSnapshots).where(
          and(
            eq(contentSnapshots.spaceId, spaceId),
            eq(contentSnapshots.version, 'published'),
            inArray(
              contentSnapshots.contentId,
              unpublished.map(it => it.id),
            ),
          ),
        );
      }
      return { result: target, changed: unpublished.map(it => ({ id: it.id, op: 'updated' as const })), drafts: false };
    });
  }

  /**
   * Runs `work` in the write's transaction (or the caller's), with the space checked first; then drops the snapshots
   * the change makes stale and queues the change events. When `work` finds no content it answers `undefined`.
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
      if (outcome.changed.length) {
        if (outcome.drafts !== false) {
          const updated = outcome.changed.filter(it => it.op === 'updated').map(it => it.id);
          await dropContentDrafts(t, spaceId, updated);
        }
        await dropContentLinks(t, spaceId);
      }
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

  /**
   * Runs a write that puts something at `fullSlug` (or under it). The check before it can not see a write that has not
   * committed yet; the unique index then refuses this one, with the same 409 as the check.
   */
  private async claimPath<T>(fullSlug: string, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(`'${fullSlug}' is already used`);
      throw error;
    }
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
