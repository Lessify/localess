import type { ContentData } from '@localess/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { contents, contentSnapshots, keepUpdatedAt, schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropContentDrafts, dropContentLinks, lockContents } from '../../../shared/data-rules/content-snapshots.js';
import type { ContentEntity } from '../../../shared/entities/content.entity.js';
import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import {
  type ContentWithPath,
  type Executor,
  folderPaths,
  isUnderOrSelf,
  pathOf,
  subtree,
  withPaths,
} from '../../../shared/queries/content-tree.query.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
import { buildDocumentStorage } from '../utils/content-extract.js';
import { startsWith } from '../utils/slug.utils.js';

export type { ContentWithPath };

export interface ContentQuery {
  /** `null`: the root's children; absent: any parent. */
  parentId?: string | null;
  kind?: 'FOLDER' | 'DOCUMENT';
  /** Case-insensitive name prefix. */
  name?: string;
  ids?: string[];
  limit?: number;
}

export interface NewContent {
  kind: 'FOLDER' | 'DOCUMENT';
  /** The folder; absent or `null`: the root. */
  parentId?: string | null;
  name: string;
  slug: string;
  schema?: string;
  data?: ContentData;
}

export type ContentMove = { name?: string; slug?: string; parentId?: string | null };
export type ContentDataUpdate = {
  data: ContentData;
  assets: string[];
  links: string[];
  references: string[];
};

/** `taken`: the path a sibling already has. */
export type CreateResult = { content: ContentWithPath } | { noSchema: true } | { noParent: true } | { taken: string };
export type UpdateResult = { content: ContentWithPath; moved: boolean } | { noParent: true } | { taken: string } | { intoItself: true };

interface WriteResult<T> {
  result: T;
  changed: { id: string; op: 'created' | 'updated' | 'deleted' }[];
  /** `false` when the write leaves what drafts are built from as it was (publish, unpublish). */
  drafts?: boolean;
}

const TAKEN = Symbol('taken');

/**
 * The `contents` rows of a space and their published snapshots (`content_snapshots`). The tree is linked by
 * `parent_id`: the foreign key keeps every child with its parent (a delete cascades to the subtree), the unique
 * `(parent, slug)` keeps siblings apart, and paths are computed (content-tree.query.ts), so a rename or move changes one
 * row. Every write, in one transaction: the space checked (404 when gone), the contents lock (first, so the writes of a
 * space run one at a time and never deadlock on row locks), the change, the drafts of the changed documents and the
 * `/links` lists dropped (content-snapshots.ts) and a `contents` change event per changed row. Rules the database does
 * not hold (the parent is a folder, a folder is not moved under itself) are checked in the write's transaction and
 * answered as results (`noParent`, `taken`, `intoItself`, …) for the service to word. Writes on a content id the space
 * does not have answer `undefined` and change nothing.
 */
@Injectable()
export class ContentRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  async findAll(spaceId: string, query: ContentQuery): Promise<ContentWithPath[]> {
    const conditions: SQL[] = [eq(contents.spaceId, spaceId)];
    if (query.parentId === null) conditions.push(isNull(contents.parentId));
    else if (query.parentId !== undefined) conditions.push(eq(contents.parentId, query.parentId));
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
    const rows = await (query.limit ? select.limit(query.limit) : select);
    return withPaths(rows, await folderPaths(this.db, spaceId));
  }

  /** Every folder of the space, by name: the editor's folder map. */
  findFolders(spaceId: string): Promise<Pick<ContentEntity, 'id' | 'parentId' | 'name' | 'slug'>[]> {
    return this.db
      .select({ id: contents.id, parentId: contents.parentId, name: contents.name, slug: contents.slug })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.kind, 'FOLDER')))
      .orderBy(asc(contents.name));
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(contents)
      .where(kind ? and(eq(contents.spaceId, spaceId), eq(contents.kind, kind)) : eq(contents.spaceId, spaceId));
    return Number(value);
  }

  async findById(spaceId: string, id: string): Promise<ContentWithPath | undefined> {
    const row = await this.find(this.db, spaceId, id);
    return row ? this.withPath(this.db, spaceId, row) : undefined;
  }

  /**
   * A document's schema must be a ROOT schema of the space, whose row is locked (shared) until the commit: a rename
   * or delete of it waits and then sees the new document, or runs first and this finds none. The parent folder is
   * locked the same way, so a delete of it waits for the insert (and then takes the new child with it).
   */
  create(spaceId: string, values: NewContent, tx?: Transaction): Promise<CreateResult> {
    return this.write<CreateResult>(spaceId, tx, async t => {
      if (values.kind === 'DOCUMENT') {
        const [schema] = await t
          .select({ type: schemas.type })
          .from(schemas)
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.name, values.schema ?? '')))
          .for('share');
        if (schema?.type !== 'ROOT') return { result: { noSchema: true as const }, changed: [] };
      }
      const parentId = values.parentId ?? null;
      if (parentId && !(await this.lockFolder(t, spaceId, parentId))) return { result: { noParent: true as const }, changed: [] };
      const inserted = await this.unlessTaken(t, sp =>
        sp
          .insert(contents)
          .values({
            id: newUuid(),
            spaceId,
            parentId,
            kind: values.kind,
            name: values.name,
            slug: values.slug,
            schema: values.kind === 'DOCUMENT' ? values.schema : null,
            data: values.kind === 'DOCUMENT' ? (values.data ?? null) : null,
          })
          .returning(),
      );
      if (inserted === TAKEN) return { result: { taken: await this.pathAt(t, spaceId, parentId, values.slug) }, changed: [] };
      const content = await this.withPath(t, spaceId, inserted[0]);
      return { result: { content }, changed: [{ id: content.id, op: 'created' }] };
    });
  }

  /**
   * Rename and/or move: one row, whatever is under it (paths are computed). A folder moved is checked not to go under
   * itself; the contents lock every write takes first means two crossing moves can not both pass. `moved`: the path changed; then the drafts
   * of everything under it go too.
   */
  update(spaceId: string, id: string, values: ContentMove, tx?: Transaction): Promise<UpdateResult | undefined> {
    return this.write<UpdateResult>(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      const slug = values.slug ?? current.slug;
      const parentId = values.parentId !== undefined ? values.parentId : current.parentId;
      const parentChanged = parentId !== current.parentId;
      if (parentChanged && parentId && !(await this.lockFolder(t, spaceId, parentId))) {
        return { result: { noParent: true as const }, changed: [] };
      }
      if (parentChanged && current.kind === 'FOLDER' && (await isUnderOrSelf(t, spaceId, id, parentId))) {
        return { result: { intoItself: true as const }, changed: [] };
      }
      const updated = await this.unlessTaken(t, sp =>
        sp
          .update(contents)
          .set({ name: values.name ?? current.name, slug, parentId })
          .where(this.byId(spaceId, id))
          .returning(),
      );
      if (updated === TAKEN) return { result: { taken: await this.pathAt(t, spaceId, parentId, slug) }, changed: [] };
      const moved = parentChanged || slug !== current.slug;
      const changed: { id: string; op: 'updated' }[] = [{ id, op: 'updated' }];
      if (moved && current.kind === 'FOLDER') {
        const under = await subtree(t, spaceId, id);
        changed.push(...under.filter(it => it.id !== id).map(it => ({ id: it.id, op: 'updated' as const })));
      }
      return { result: { content: await this.withPath(t, spaceId, updated[0]), moved }, changed };
    });
  }

  /** Saves the editor's data and the ids it references (assets, links, references). */
  updateData(
    spaceId: string,
    id: string,
    values: ContentDataUpdate,
    tx?: Transaction,
  ): Promise<ContentWithPath | { notDocument: true } | undefined> {
    return this.write<ContentWithPath | { notDocument: true }>(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (current.kind !== 'DOCUMENT') return { result: { notDocument: true as const }, changed: [] };
      const [row] = await t.update(contents).set(values).where(this.byId(spaceId, id)).returning();
      return { result: await this.withPath(t, spaceId, row), changed: [{ id, op: 'updated' }] };
    });
  }

  /** Deletes the item and everything under it (the foreign key cascades); answers what was deleted. Their snapshots cascade. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<{ id: string; fullSlug: string }[] | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      // The paths, for the events and webhooks, before the rows go.
      await this.lockFolder(t, spaceId, id, 'update');
      const ids = (await subtree(t, spaceId, id)).map(it => it.id);
      const rows = await t
        .select({ id: contents.id, parentId: contents.parentId, slug: contents.slug })
        .from(contents)
        .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, ids)));
      const deleted = withPaths(rows, await folderPaths(t, spaceId)).map(it => ({ id: it.id, fullSlug: it.fullSlug }));
      await t.delete(contents).where(this.byId(spaceId, id));
      return { result: deleted, changed: deleted.map(it => ({ id: it.id, op: 'deleted' as const })) };
    });
  }

  /**
   * Publish a document (one snapshot per space locale, all with the publish time as `built_at`, their `cv`), or every
   * document under a folder that changed since it was last published. `updatedAt` is left alone so "changed since
   * publish" keeps working. Answers the published item.
   */
  publish(spaceId: string, id: string, tx?: Transaction): Promise<ContentWithPath | undefined> {
    return this.write(spaceId, tx, async (t, space) => {
      const target = await this.find(t, spaceId, id);
      if (!target) return undefined;
      const folders = await folderPaths(t, spaceId);
      const documents =
        target.kind === 'DOCUMENT'
          ? [target]
          : (await this.documentsUnder(t, spaceId, id)).filter(doc => !(doc.publishedAt && doc.publishedAt > doc.updatedAt));
      const schemaById = schemasByName(await t.select().from(schemas).where(eq(schemas.spaceId, spaceId)));
      const publishedAt = new Date();
      const localeIds = space.spaceLocales.map(it => it.localeId);
      for (const document of withPaths(documents, folders)) {
        for (const locale of localeIds) {
          const data = buildDocumentStorage(document, schemaById, locale, publishedAt.toISOString());
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
      return {
        result: { ...target, ...pathOf(target, folders) },
        changed: documents.map(it => ({ id: it.id, op: 'updated' as const })),
        drafts: false,
      };
    });
  }

  /** Stops serving a document (or every published document under a folder). Answers the unpublished item. */
  unpublish(spaceId: string, id: string, tx?: Transaction): Promise<ContentWithPath | undefined> {
    return this.write(spaceId, tx, async t => {
      const target = await this.find(t, spaceId, id);
      if (!target) return undefined;
      const ids = target.kind === 'DOCUMENT' ? [id] : (await this.documentsUnder(t, spaceId, id)).map(it => it.id);
      const unpublished = ids.length
        ? await t
            .update(contents)
            .set({ publishedAt: null, ...keepUpdatedAt(contents) })
            .where(and(eq(contents.spaceId, spaceId), isNotNull(contents.publishedAt), inArray(contents.id, ids)))
            .returning({ id: contents.id })
        : [];
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
      return {
        result: await this.withPath(t, spaceId, target),
        changed: unpublished.map(it => ({ id: it.id, op: 'updated' as const })),
        drafts: false,
      };
    });
  }

  /**
   * Runs `work` in the write's transaction (or the caller's), with the space checked first; then drops the snapshots
   * the change makes stale and queues the change events. When `work` finds no content it answers `undefined`.
   */
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction, space: SpaceWithLocales) => Promise<WriteResult<T>>,
  ): Promise<T>;
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction, space: SpaceWithLocales) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined>;
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction, space: SpaceWithLocales) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined> {
    return transaction(this.db, tx, async t => {
      const space = await this.spaceLookupRepository.findOne(spaceId, t);
      if (!space) throw new NotFoundException('Space not found');
      // First, before any row lock: every write of the space takes the contents lock in the same order, so two writes
      // never wait on each other's row locks (a deadlock), and each one's checks see the previous one committed.
      await lockContents(t, spaceId);
      const outcome = await work(t, space);
      if (!outcome) return undefined;
      if (outcome.changed.length) {
        if (outcome.drafts !== false) {
          const updated = outcome.changed.filter(it => it.op === 'updated').map(it => it.id);
          await dropContentDrafts(t, spaceId, updated);
        }
        await dropContentLinks(t, spaceId);
      }
      for (const it of outcome.changed) await this.eventService.publish({ spaceId, entity: 'contents', ...it }, t);
      return outcome.result;
    });
  }

  /** Locks folder `id` (shared: it may not be deleted or moved meanwhile); `false` when the space has no such folder. */
  private async lockFolder(t: Transaction, spaceId: string, id: string, strength: 'share' | 'update' = 'share'): Promise<boolean> {
    const [row] = await t.select({ kind: contents.kind }).from(contents).where(this.byId(spaceId, id)).for(strength);
    return row?.kind === 'FOLDER';
  }

  /** The documents under folder `id`, at any depth. */
  private async documentsUnder(t: Transaction, spaceId: string, id: string): Promise<ContentEntity[]> {
    const ids = (await subtree(t, spaceId, id)).filter(it => it.kind === 'DOCUMENT').map(it => it.id);
    if (!ids.length) return [];
    return t
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, ids)));
  }

  /** Runs a write in a savepoint; `TAKEN` when a sibling has the slug (the transaction stays usable). */
  private async unlessTaken<T>(t: Transaction, write: (sp: Transaction) => Promise<T>): Promise<T | typeof TAKEN> {
    try {
      return await t.transaction(sp => write(sp));
    } catch (error) {
      if (isUniqueViolation(error)) return TAKEN;
      throw error;
    }
  }

  /** The path an item named `slug` would have under `parentId`. */
  private async pathAt(t: Transaction, spaceId: string, parentId: string | null, slug: string): Promise<string> {
    return pathOf({ parentId, slug }, await folderPaths(t, spaceId)).fullSlug;
  }

  private async withPath(executor: Executor, spaceId: string, row: ContentEntity): Promise<ContentWithPath> {
    return { ...row, ...pathOf(row, await folderPaths(executor, spaceId)) };
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
