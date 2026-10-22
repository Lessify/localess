import type { ContentData, ContentPageable } from '@localess/shared';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { contents, contentSnapshots, keepUpdatedAt, schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { dropContentDrafts, dropContentLinks, lockContents } from '../../../shared/data-rules/content-snapshots.js';
import type { ContentEntity } from '../../../shared/entities/content.entity.js';
import {
  type ContentWithPath,
  type Executor,
  folderPaths,
  isUnderOrSelf,
  pathOf,
  subtree,
  withPaths,
} from '../../../shared/queries/content-tree.query.js';
import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
import { containsPattern, offsetOf } from '../../../shared/utils/paging.js';
import { contentErrors } from '../utils/content-errors.js';
import { buildDocumentStorage } from '../utils/content-extract.js';

export type { ContentWithPath };

/** A row of the content list: everything but the document's data and the ids it points to (read only by the editor). */
export type ContentListRow = Omit<ContentEntity, 'data' | 'assets' | 'links' | 'references'> & { parentSlug: string; fullSlug: string };

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
/** A document's data with the ids it points to (worked out by the service). */
export type ContentDataValues = {
  data: ContentData;
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

const TAKEN = Symbol('taken');

/**
 * The `contents` rows of a space and their published snapshots (`content_snapshots`). The tree is linked by
 * `parent_id`: the foreign key keeps every child with its parent (a delete cascades to the subtree), the unique
 * `(parent, slug)` keeps siblings apart, and paths are computed (content-tree.query.ts), so a rename or move changes one
 * row. Every write, in one transaction: the contents lock (first, so the writes of a space run one at a time and never
 * deadlock on row locks), the change, the drafts of the changed documents and the `/links` lists dropped
 * (content-snapshots.ts) and a `contents` change event per changed row. The service has checked the space and the
 * content; the rules that must hold at the write (a document's schema is a ROOT schema, the parent is a folder, the slug
 * is free among its siblings, a folder is not moved under itself) are checked again under the lock and refused with the
 * service's messages (`contentErrors`: 400, 409). Writes answer nothing (`create` the new id, `delete` what it deleted);
 * on a content id the space does not have (deleted meanwhile) they change nothing.
 */
@Injectable()
export class ContentRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /**
   * One page: folders first, then by the query's sort (`name` case-insensitive, the default), then the id so equal
   * values page stably. Without the document's data and the ids it points to.
   */
  async findAll(spaceId: string, query: ContentPageable): Promise<ContentListRow[]> {
    const order = query.direction === 'desc' ? desc : asc;
    const column = {
      name: sql`lower(${contents.name})`,
      schema: contents.schema,
      publishedAt: contents.publishedAt,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
    }[query.sort];
    const rows = await this.db.query.contents.findMany({
      columns: { data: false, assets: false, links: false, references: false },
      where: this.where(spaceId, query),
      orderBy: [desc(contents.kind), order(column), asc(contents.id)],
      limit: query.size,
      offset: offsetOf(query),
    });
    return withPaths(rows, await folderPaths(this.db, spaceId));
  }

  /** How many contents match the query's folder, kind and search. */
  findAllCount(spaceId: string, query: ContentPageable): Promise<number> {
    return this.db.$count(contents, this.where(spaceId, query));
  }

  /** Every folder of the space, by name: the editor's folder map. */
  findFolders(spaceId: string): Promise<Pick<ContentEntity, 'id' | 'parentId' | 'name' | 'slug'>[]> {
    return this.db.query.contents.findMany({
      columns: { id: true, parentId: true, name: true, slug: true },
      where: and(eq(contents.spaceId, spaceId), eq(contents.kind, 'FOLDER')),
      orderBy: [asc(contents.name)],
    });
  }

  /** Every content of the space, or every one of `kind`. */
  count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    return this.db.$count(contents, kind ? and(eq(contents.spaceId, spaceId), eq(contents.kind, kind)) : eq(contents.spaceId, spaceId));
  }

  async findOne(spaceId: string, id: string): Promise<ContentWithPath | undefined> {
    const row = await this.find(this.db, spaceId, id);
    return row ? this.withPath(this.db, spaceId, row) : undefined;
  }

  /**
   * A document's schema must be a ROOT schema of the space, whose row is locked (shared) until the commit: a rename
   * or delete of it waits and then sees the new document, or runs first and this finds none. The parent folder is
   * locked the same way, so a delete of it waits for the insert (and then takes the new child with it).
   */
  async create(spaceId: string, values: NewContent, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await this.write(spaceId, tx, async t => {
      if (values.kind === 'DOCUMENT') {
        const [schema] = await t
          .select({ type: schemas.type })
          .from(schemas)
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.name, values.schema ?? '')))
          .for('share');
        if (schema?.type !== 'ROOT') throw new BadRequestException(contentErrors.noSchema(values.schema));
      }
      const parentId = values.parentId ?? null;
      if (parentId && !(await this.lockFolder(t, spaceId, parentId))) throw new BadRequestException(contentErrors.noParent);
      const inserted = await this.unlessTaken(t, sp =>
        sp.insert(contents).values({
          id,
          spaceId,
          parentId,
          kind: values.kind,
          name: values.name,
          slug: values.slug,
          schema: values.kind === 'DOCUMENT' ? values.schema : null,
          data: values.kind === 'DOCUMENT' ? (values.data ?? null) : null,
        }),
      );
      if (inserted === TAKEN) throw new ConflictException(contentErrors.taken(await this.pathAt(t, spaceId, parentId, values.slug)));
      return { result: undefined, changed: [{ id, op: 'created' }] };
    });
    return id;
  }

  /**
   * Rename and/or move: one row, whatever is under it (paths are computed). A folder moved is checked not to go under
   * itself; the contents lock every write takes first means two crossing moves can not both pass. `moved`: the path changed; then the drafts
   * of everything under it go too.
   */
  update(spaceId: string, id: string, values: ContentMove, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      const slug = values.slug ?? current.slug;
      const parentId = values.parentId !== undefined ? values.parentId : current.parentId;
      const parentChanged = parentId !== current.parentId;
      if (parentChanged && parentId && !(await this.lockFolder(t, spaceId, parentId)))
        throw new BadRequestException(contentErrors.noParent);
      if (parentChanged && current.kind === 'FOLDER' && (await isUnderOrSelf(t, spaceId, id, parentId))) {
        throw new BadRequestException(contentErrors.intoItself);
      }
      const updated = await this.unlessTaken(t, sp =>
        sp
          .update(contents)
          .set({ name: values.name ?? current.name, slug, parentId })
          .where(this.byId(spaceId, id)),
      );
      if (updated === TAKEN) throw new ConflictException(contentErrors.taken(await this.pathAt(t, spaceId, parentId, slug)));
      const moved = parentChanged || slug !== current.slug;
      const changed: { id: string; op: 'updated' }[] = [{ id, op: 'updated' }];
      if (moved && current.kind === 'FOLDER') {
        const under = await subtree(t, spaceId, id);
        changed.push(...under.filter(it => it.id !== id).map(it => ({ id: it.id, op: 'updated' as const })));
      }
      return { result: undefined, changed };
    });
  }

  /** Saves the editor's data and the ids it references (assets, links, references). */
  updateData(spaceId: string, id: string, values: ContentDataValues, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (current.kind !== 'DOCUMENT') throw new BadRequestException(contentErrors.notDocument);
      await t.update(contents).set(values).where(this.byId(spaceId, id));
      return { result: undefined, changed: [{ id, op: 'updated' }] };
    });
  }

  /**
   * Deletes the item and everything under it (the foreign key cascades; their snapshots too). Answers what it deleted,
   * worked out under the lock: the service sends a webhook for each (gone meanwhile: nothing).
   */
  async delete(spaceId: string, id: string, tx?: Transaction): Promise<{ id: string; fullSlug: string }[]> {
    const deleted = await this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      // The paths, for the events and webhooks, before the rows go.
      await this.lockFolder(t, spaceId, id, 'update');
      const ids = (await subtree(t, spaceId, id)).map(it => it.id);
      const rows = await t.query.contents.findMany({
        columns: { id: true, parentId: true, slug: true },
        where: and(eq(contents.spaceId, spaceId), inArray(contents.id, ids)),
      });
      const gone = withPaths(rows, await folderPaths(t, spaceId)).map(it => ({ id: it.id, fullSlug: it.fullSlug }));
      await t.delete(contents).where(this.byId(spaceId, id));
      return { result: gone, changed: gone.map(it => ({ id: it.id, op: 'deleted' as const })) };
    });
    return deleted ?? [];
  }

  /**
   * Publish a document (one snapshot per space locale, all with the publish time as `built_at`, their `cv`), or every
   * document under a folder that changed since it was last published. `updatedAt` is left alone so "changed since
   * publish" keeps working. `localeIds`: the space's locales, a snapshot each.
   */
  publish(spaceId: string, id: string, localeIds: string[], tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const target = await this.find(t, spaceId, id);
      if (!target) return undefined;
      const folders = await folderPaths(t, spaceId);
      const documents =
        target.kind === 'DOCUMENT'
          ? [target]
          : (await this.documentsUnder(t, spaceId, id)).filter(doc => !(doc.publishedAt && doc.publishedAt > doc.updatedAt));
      const schemaById = schemasByName(await t.query.schemas.findMany({ where: eq(schemas.spaceId, spaceId) }));
      const publishedAt = new Date();
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
      return { result: undefined, changed: documents.map(it => ({ id: it.id, op: 'updated' as const })), drafts: false };
    });
  }

  /** Stops serving a document (or every published document under a folder). */
  unpublish(spaceId: string, id: string, tx?: Transaction): Promise<void> {
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
      return { result: undefined, changed: unpublished.map(it => ({ id: it.id, op: 'updated' as const })), drafts: false };
    });
  }

  /**
   * Runs `work` in the write's transaction (or the caller's), after the contents lock; then drops the snapshots the
   * change makes stale and queues the change events. `work` answers `undefined` when it found no content.
   */
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined> {
    return transaction(this.db, tx, async t => {
      // First, before any row lock: every write of the space takes the contents lock in the same order, so two writes
      // never wait on each other's row locks (a deadlock), and each one's checks see the previous one committed.
      await lockContents(t, spaceId);
      const outcome = await work(t);
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
    // A lock (`.for(…)`): the relational API has none.
    const [row] = await t.select({ kind: contents.kind }).from(contents).where(this.byId(spaceId, id)).for(strength);
    return row?.kind === 'FOLDER';
  }

  /** The documents under folder `id`, at any depth. */
  private async documentsUnder(t: Transaction, spaceId: string, id: string): Promise<ContentEntity[]> {
    const ids = (await subtree(t, spaceId, id)).filter(it => it.kind === 'DOCUMENT').map(it => it.id);
    if (!ids.length) return [];
    return t.query.contents.findMany({ where: and(eq(contents.spaceId, spaceId), inArray(contents.id, ids)) });
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

  private find(executor: Database | Transaction, spaceId: string, id: string): Promise<ContentEntity | undefined> {
    return executor.query.contents.findFirst({ where: this.byId(spaceId, id) });
  }

  /**
   * The query's filters: given `ids`, those contents wherever they are; else the folder's children (the root without
   * `parentId`), or with `deep` everything under it (under the root: the whole space). Then the kind and the search (the
   * name or the slug, anywhere, case-insensitive).
   */
  private where(spaceId: string, query: ContentPageable): SQL | undefined {
    const conditions: SQL[] = [eq(contents.spaceId, spaceId)];
    if (query.ids) {
      const ids = query.ids.filter(isUuid);
      conditions.push(ids.length ? inArray(contents.id, ids) : sql`false`);
    } else if (!query.deep) {
      conditions.push(query.parentId ? eq(contents.parentId, query.parentId) : isNull(contents.parentId));
    } else if (query.parentId) {
      // A subquery in the condition: everything below the folder, at any depth.
      conditions.push(sql`${contents.id} in (
        with recursive down(id) as (
          select id from ${contents} where space_id = ${spaceId} and parent_id = ${query.parentId}
          union
          select c.id from down d join ${contents} c on c.space_id = ${spaceId} and c.parent_id = d.id
        )
        select id from down)`);
    }
    if (query.kind) conditions.push(eq(contents.kind, query.kind));
    if (query.search) {
      const pattern = containsPattern(query.search);
      conditions.push(or(ilike(contents.name, pattern), ilike(contents.slug, pattern)) as SQL);
    }
    return and(...conditions);
  }

  private byId(spaceId: string, id: string) {
    return and(eq(contents.spaceId, spaceId), eq(contents.id, id));
  }
}
