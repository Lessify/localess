import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNull, like, or, sql, SQL } from 'drizzle-orm';
import { escapeLike } from '../../../shared/utils/paging.js';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { assets, contents } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { guardUpload, releaseUploadGuards, scheduleAssetFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import { assetSubtree, isAssetUnderOrSelf } from '../../../shared/queries/asset-tree.query.js';
import type { AssetEntity } from '../../../shared/entities/asset.entity.js';

export interface AssetQuery {
  /** `null`: the root's children; absent: any parent. */
  parentId?: string | null;
  kind?: 'FOLDER' | 'FILE';
  /** Case-insensitive name prefix. */
  name?: string;
  /** MIME prefix, e.g. `image` or `video`. */
  fileType?: string;
  ids?: string[];
  limit?: number;
}

/** A stored file's row: the id its storage key was written under, and what was read from the upload. */
export interface NewAssetFile {
  id: string;
  name: string;
  extension: string;
  type: string;
  size: number;
  md5: string;
  parentId: string | null;
  alt: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
}

interface WriteResult<T> {
  result: T;
  changed: { id: string; op: 'created' | 'updated' | 'deleted' }[];
}

export type MoveResult = { asset: AssetEntity } | { noParent: true } | { intoItself: true };

/**
 * The `assets` rows of a space. The tree is linked by `parent_id`: the foreign key keeps every child with its parent
 * (a delete cascades to the subtree, whose stored files are queued first), so a move changes one row. Every write, in
 * one transaction: the space checked (404 when gone), the space's assets lock (first, so the writes of a space run one
 * at a time and never deadlock on row locks), the change and an `assets` change event per changed row. The parent is
 * checked to be a folder of the space in the write's transaction. Writes on an asset id the space does not have answer
 * `undefined` and change nothing.
 */
@Injectable()
export class AssetRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventService,
  ) {}

  findAll(spaceId: string, query: AssetQuery): Promise<AssetEntity[]> {
    const conditions: SQL[] = [eq(assets.spaceId, spaceId)];
    if (query.parentId === null) conditions.push(isNull(assets.parentId));
    else if (query.parentId !== undefined) conditions.push(eq(assets.parentId, query.parentId));
    if (query.kind) conditions.push(eq(assets.kind, query.kind));
    if (query.name) conditions.push(ilike(assets.name, `${escapeLike(query.name)}%`));
    // Folders stay visible while browsing by file type.
    if (query.fileType) conditions.push(or(eq(assets.kind, 'FOLDER'), like(assets.type, `${escapeLike(query.fileType)}%`)) as SQL);
    if (query.ids) {
      const ids = query.ids.filter(isUuid);
      conditions.push(ids.length ? inArray(assets.id, ids) : sql`false`);
    }
    const select = this.db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(desc(assets.kind), asc(assets.name));
    return query.limit ? select.limit(query.limit) : select;
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'FILE'): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(assets)
      .where(kind ? and(eq(assets.spaceId, spaceId), eq(assets.kind, kind)) : eq(assets.spaceId, spaceId));
    return Number(value);
  }

  findById(spaceId: string, id: string): Promise<AssetEntity | undefined> {
    return this.find(this.db, spaceId, id);
  }

  /** The UUID of the asset imported from Firebase with the Firestore id `legacyId`. */
  async findIdByLegacyId(spaceId: string, legacyId: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: assets.id })
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.legacyId, legacyId)));
    return row?.id;
  }

  /** Every folder of the space, by name: the editor's folder map. */
  findFolders(spaceId: string): Promise<Pick<AssetEntity, 'id' | 'parentId' | 'name'>[]> {
    return this.db
      .select({ id: assets.id, parentId: assets.parentId, name: assets.name })
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FOLDER')))
      .orderBy(asc(assets.name));
  }

  /** Whether `parentId` is null (the root) or a folder of the space. */
  async isFolder(spaceId: string, parentId: string | null): Promise<boolean> {
    if (!parentId) return true;
    const row = await this.find(this.db, spaceId, parentId);
    return row?.kind === 'FOLDER';
  }

  /** `undefined` when `parentId` is not a folder of the space. */
  createFolder(spaceId: string, parentId: string | null, name: string, tx?: Transaction): Promise<AssetEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      if (parentId && !(await this.lockFolder(t, spaceId, parentId))) return undefined;
      const [row] = await t.insert(assets).values({ id: newUuid(), spaceId, kind: 'FOLDER', name, parentId }).returning();
      return { result: row, changed: [{ id: row.id, op: 'created' }] };
    });
  }

  /** Before an upload stores a new asset's file: queued for deletion in an hour unless its row is created. */
  async guardUpload(spaceId: string, id: string): Promise<void> {
    await guardUpload(this.db, spaceId, id);
  }

  /** After an upload cleaned up its own file: its guard is no longer needed. */
  async releaseUploadGuard(spaceId: string, id: string): Promise<void> {
    await releaseUploadGuards(this.db, spaceId, [id]);
  }

  /**
   * The row of a file already in storage, releasing its guard. `undefined` when its folder is gone since the upload
   * checked it (the file is then the caller's to remove).
   */
  createFile(spaceId: string, values: NewAssetFile, tx?: Transaction): Promise<AssetEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      if (values.parentId && !(await this.lockFolder(t, spaceId, values.parentId))) return undefined;
      const [row] = await t
        .insert(assets)
        .values({ ...values, spaceId, kind: 'FILE' })
        .returning();
      await releaseUploadGuards(t, spaceId, [values.id]);
      return { result: row, changed: [{ id: values.id, op: 'created' }] };
    });
  }

  /** Name for folders; name and alt for files (empty alt removes it). */
  update(spaceId: string, id: string, values: { name?: string; alt?: string }, tx?: Transaction): Promise<AssetEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (current.kind !== 'FILE' && values.alt !== undefined) throw new BadRequestException('Only files have alt text');
      const [row] = await t
        .update(assets)
        .set({
          name: values.name ?? current.name,
          ...(current.kind === 'FILE' && values.alt !== undefined ? { alt: values.alt || null } : {}),
        })
        .where(this.byId(spaceId, id))
        .returning();
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  /** A file or a folder, with everything under it: one row. A folder is not moved under itself (`intoItself`). */
  move(spaceId: string, id: string, parentId: string | null, tx?: Transaction): Promise<MoveResult | undefined> {
    return this.write<MoveResult>(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (parentId && !(await this.lockFolder(t, spaceId, parentId))) return { result: { noParent: true as const }, changed: [] };
      if (current.kind === 'FOLDER' && (await isAssetUnderOrSelf(t, spaceId, id, parentId))) {
        return { result: { intoItself: true as const }, changed: [] };
      }
      const [row] = await t.update(assets).set({ parentId }).where(this.byId(spaceId, id)).returning();
      return { result: { asset: row }, changed: [{ id, op: 'updated' }] };
    });
  }

  /** Deletes a file, or a folder with every row under it, queueing their stored files for deletion. Answers the deleted rows. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<{ id: string; kind: string }[] | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      // The subtree before the rows go (the foreign key cascades): its files are queued, its rows are the events.
      const rows = await assetSubtree(t, spaceId, id);
      await t.delete(assets).where(this.byId(spaceId, id));
      // Their stored files go through the queue: the sweeper deletes them after the commit.
      await scheduleAssetFilesDeletion(
        t,
        spaceId,
        rows.filter(it => it.kind === 'FILE').map(it => it.id),
      );
      return { result: rows, changed: rows.map(it => ({ id: it.id, op: 'deleted' as const })) };
    });
  }

  /**
   * Runs `work` in the write's transaction (or the caller's), with the space checked first; then queues the change
   * events. When `work` finds no asset it answers `undefined`.
   */
  private write<T>(spaceId: string, tx: Transaction | undefined, work: (tx: Transaction) => Promise<WriteResult<T>>): Promise<T>;
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined>;
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined> {
    return transaction(this.db, tx, async t => {
      await requireSpace(t, spaceId);
      // First, before any row lock: the writes of a space take it in the same order, so they never deadlock.
      await t.execute(sql`select pg_advisory_xact_lock(hashtext('assets'), hashtext(${spaceId}))`);
      const outcome = await work(t);
      if (!outcome) return undefined;
      for (const it of outcome.changed) await this.events.publish({ spaceId, entity: 'assets', ...it }, t);
      return outcome.result;
    });
  }

  /** The file itself, or every file under a folder (at any depth); `undefined` when there is no asset `id`. */
  async findFileIdsWithin(spaceId: string, id: string): Promise<string[] | undefined> {
    const current = await this.find(this.db, spaceId, id);
    if (!current) return undefined;
    if (current.kind === 'FILE') return [current.id];
    return (await assetSubtree(this.db, spaceId, id)).filter(it => it.kind === 'FILE').map(it => it.id);
  }

  /**
   * How many contents use one of `assetIds`: their draft data holds `{ kind: 'ASSET', uri: <id> }` at any depth, in
   * any locale variant. Read from the data itself, the source of truth (not the `assets` array the editor sends).
   */
  async countContentsUsing(spaceId: string, assetIds: string[]): Promise<number> {
    if (!assetIds.length) return 0;
    const ids = sql.join(
      assetIds.map(id => sql`${id}`),
      sql`, `,
    );
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(contents)
      .where(
        and(
          eq(contents.spaceId, spaceId),
          sql`exists (select 1 from jsonb_path_query(${contents.data}, 'lax $.** ? (@.kind == "ASSET").uri') as ref(uri) where ref.uri #>> '{}' in (${ids}))`,
        ),
      );
    return Number(value);
  }

  /** Locks folder `id` (shared: not deleted or moved meanwhile); `false` when the space has no such folder. */
  private async lockFolder(t: Transaction, spaceId: string, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const [row] = await t.select({ kind: assets.kind }).from(assets).where(this.byId(spaceId, id)).for('share');
    return row?.kind === 'FOLDER';
  }

  private async find(executor: Pick<Database, 'select'>, spaceId: string, id: string): Promise<AssetEntity | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await executor.select().from(assets).where(this.byId(spaceId, id));
    return row;
  }

  private byId(spaceId: string, id: string) {
    return and(eq(assets.spaceId, spaceId), eq(assets.id, id));
  }
}
