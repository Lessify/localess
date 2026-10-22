import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, like, or, SQL, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { assets, contents } from '../../../infra/database/schema.js';
import { type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { guardUpload, releaseUploadGuards, scheduleAssetFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import type { AssetEntity } from '../../../shared/entities/asset.entity.js';
import { assetSubtree, isAssetUnderOrSelf } from '../../../shared/queries/asset-tree.query.js';
import { escapeLike } from '../../../shared/utils/paging.js';
import { assetErrors } from '../utils/asset-errors.js';

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

/**
 * The `assets` rows of a space. The tree is linked by `parent_id`: the foreign key keeps every child with its parent
 * (a delete cascades to the subtree, whose stored files are queued first), so a move changes one row. Every write, in
 * one transaction: the space's assets lock (first, so the writes of a space run one at a time and never deadlock on row
 * locks), the change and an `assets` change event per changed row. The service checks the space, the asset and the
 * parent first; a write checks the parent again under the lock and throws the service's message (`assetErrors`) when
 * another write changed it since. A write on an asset that went meanwhile changes nothing: the service's read after it
 * answers 404.
 */
@Injectable()
export class AssetRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
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
    return this.db.query.assets.findMany({
      where: and(...conditions),
      orderBy: [desc(assets.kind), asc(assets.name)],
      ...(query.limit ? { limit: query.limit } : {}),
    });
  }

  count(spaceId: string, kind?: 'FOLDER' | 'FILE'): Promise<number> {
    return this.db.$count(assets, kind ? and(eq(assets.spaceId, spaceId), eq(assets.kind, kind)) : eq(assets.spaceId, spaceId));
  }

  findOne(spaceId: string, id: string): Promise<AssetEntity | undefined> {
    return this.find(this.db, spaceId, id);
  }

  /** The UUID of the asset imported from Firebase with the Firestore id `legacyId`. */
  async findIdByLegacyId(spaceId: string, legacyId: string): Promise<string | undefined> {
    const row = await this.db.query.assets.findFirst({
      columns: { id: true },
      where: and(eq(assets.spaceId, spaceId), eq(assets.legacyId, legacyId)),
    });
    return row?.id;
  }

  /** Every folder of the space, by name: the editor's folder map. */
  findFolders(spaceId: string): Promise<Pick<AssetEntity, 'id' | 'parentId' | 'name'>[]> {
    return this.db.query.assets.findMany({
      columns: { id: true, parentId: true, name: true },
      where: and(eq(assets.spaceId, spaceId), eq(assets.kind, 'FOLDER')),
      orderBy: asc(assets.name),
    });
  }

  /** Whether `parentId` is null (the root) or a folder of the space. */
  async isFolder(spaceId: string, parentId: string | null): Promise<boolean> {
    if (!parentId) return true;
    const row = await this.find(this.db, spaceId, parentId);
    return row?.kind === 'FOLDER';
  }

  /** The new folder's id. The parent is locked (shared): a delete or move of it waits for the insert. */
  async createFolder(spaceId: string, parentId: string | null, name: string, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await this.write(spaceId, tx, async t => {
      if (parentId && !(await this.lockFolder(t, spaceId, parentId))) throw new BadRequestException(assetErrors.noFolder);
      await t.insert(assets).values({ id, spaceId, kind: 'FOLDER', name, parentId });
      return { result: undefined, changed: [{ id, op: 'created' }] };
    });
    return id;
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
   * The row of a file already in storage, releasing its guard. Throws when its folder went since the upload checked it
   * (the file is then the caller's to remove).
   */
  async createFile(spaceId: string, values: NewAssetFile, tx?: Transaction): Promise<string> {
    await this.write(spaceId, tx, async t => {
      if (values.parentId && !(await this.lockFolder(t, spaceId, values.parentId))) throw new BadRequestException(assetErrors.noFolder);
      await t.insert(assets).values({ ...values, spaceId, kind: 'FILE' });
      await releaseUploadGuards(t, spaceId, [values.id]);
      return { result: undefined, changed: [{ id: values.id, op: 'created' }] };
    });
    return values.id;
  }

  /** Name for folders; name and alt for files (empty alt removes it). */
  update(spaceId: string, id: string, values: { name?: string; alt?: string }, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (current.kind !== 'FILE' && values.alt !== undefined) throw new BadRequestException(assetErrors.altOnFolder);
      await t
        .update(assets)
        .set({
          name: values.name ?? current.name,
          ...(current.kind === 'FILE' && values.alt !== undefined ? { alt: values.alt || null } : {}),
        })
        .where(this.byId(spaceId, id));
      return { result: undefined, changed: [{ id, op: 'updated' }] };
    });
  }

  /** A file or a folder, with everything under it: one row. A folder is not moved under itself. */
  move(spaceId: string, id: string, parentId: string | null, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (parentId && !(await this.lockFolder(t, spaceId, parentId))) throw new BadRequestException(assetErrors.noFolder);
      if (current.kind === 'FOLDER' && (await isAssetUnderOrSelf(t, spaceId, id, parentId))) {
        throw new BadRequestException(assetErrors.intoItself);
      }
      await t.update(assets).set({ parentId }).where(this.byId(spaceId, id));
      return { result: undefined, changed: [{ id, op: 'updated' }] };
    });
  }

  /**
   * Deletes a file, or a folder with every row under it, queueing their stored files for deletion. Answers the deleted
   * rows; none when the asset went meanwhile.
   */
  async delete(spaceId: string, id: string, tx?: Transaction): Promise<{ id: string; kind: string }[]> {
    const deleted = await this.write(spaceId, tx, async t => {
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
    return deleted ?? [];
  }

  /**
   * Runs `work` in the write's transaction (or the caller's) after the space's assets lock; then queues the change
   * events. When `work` finds no asset it answers `undefined` and nothing changes.
   */
  private write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<WriteResult<T> | undefined>,
  ): Promise<T | undefined> {
    return transaction(this.db, tx, async t => {
      // First, before any row lock: the writes of a space take it in the same order, so they never deadlock.
      await t.execute(sql`select pg_advisory_xact_lock(hashtext('assets'), hashtext(${spaceId}))`);
      const outcome = await work(t);
      if (!outcome) return undefined;
      for (const it of outcome.changed) await this.eventService.publish({ spaceId, entity: 'assets', ...it }, t);
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
    return this.db.$count(
      contents,
      and(
        eq(contents.spaceId, spaceId),
        sql`exists (select 1 from jsonb_path_query(${contents.data}, 'lax $.** ? (@.kind == "ASSET").uri') as ref(uri) where ref.uri #>> '{}' in (${ids}))`,
      ),
    );
  }

  /** Locks folder `id` (shared: not deleted or moved meanwhile); `false` when the space has no such folder. */
  private async lockFolder(t: Transaction, spaceId: string, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    const [row] = await t.select({ kind: assets.kind }).from(assets).where(this.byId(spaceId, id)).for('share');
    return row?.kind === 'FOLDER';
  }

  private async find(executor: Database | Transaction, spaceId: string, id: string): Promise<AssetEntity | undefined> {
    if (!isUuid(id)) return undefined;
    return executor.query.assets.findFirst({ where: this.byId(spaceId, id) });
  }

  private byId(spaceId: string, id: string) {
    return and(eq(assets.spaceId, spaceId), eq(assets.id, id));
  }
}
