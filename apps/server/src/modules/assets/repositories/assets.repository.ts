import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, like, or, sql, SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { assets, contents } from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { bumpContentVersion } from '../../../shared/data-rules/content-version.js';
import { guardUpload, releaseUploadGuards, scheduleAssetFilesDeletion } from '../../../shared/data-rules/storage-deletions.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import { folderPath } from '../../../shared/utils/asset-path.utils.js';

export type AssetEntity = typeof assets.$inferSelect;

export interface AssetQuery {
  parentPath?: string;
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
  parentPath: string;
  alt: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
}

interface WriteResult<T> {
  result: T;
  changed: { id: string; op: 'created' | 'updated' | 'deleted' }[];
  bump?: boolean;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, m => `\\${m}`);

/**
 * The `assets` rows of a space. Every write, in one transaction: the space checked (404 when gone), the change, the
 * content version bumped when resolved content would change, and an `assets` change event per changed row. A parent
 * path is checked to be an existing folder inside the write's transaction. Writes on an asset id the space does not
 * have answer `undefined` and change nothing.
 */
@Injectable()
export class AssetsRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  findAll(spaceId: string, query: AssetQuery): Promise<AssetEntity[]> {
    const conditions: SQL[] = [eq(assets.spaceId, spaceId)];
    if (query.parentPath !== undefined) conditions.push(eq(assets.parentPath, query.parentPath));
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

  /** Whether `parentPath` is '' (root) or the path of an existing folder. */
  isFolderPath(spaceId: string, parentPath: string): Promise<boolean> {
    return this.folderExists(this.db, spaceId, parentPath);
  }

  createFolder(spaceId: string, parentPath: string, name: string, tx?: Transaction): Promise<AssetEntity> {
    return this.write(spaceId, tx, async t => {
      await this.checkParentPath(t, spaceId, parentPath);
      const [row] = await t.insert(assets).values({ id: newUuid(), spaceId, kind: 'FOLDER', name, parentPath }).returning();
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

  /** The row of a file already in storage (the upload checked its parent path before storing it), releasing its guard. */
  createFile(spaceId: string, values: NewAssetFile, tx?: Transaction): Promise<AssetEntity> {
    return this.write(spaceId, tx, async t => {
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
      return { result: row, changed: [{ id, op: 'updated' }], bump: true };
    });
  }

  /** Files only: a folder's descendants carry its path, so moving one would orphan them. */
  move(spaceId: string, id: string, parentPath: string, tx?: Transaction): Promise<AssetEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      if (current.kind !== 'FILE') throw new BadRequestException('Only files can be moved');
      await this.checkParentPath(t, spaceId, parentPath);
      const [row] = await t.update(assets).set({ parentPath }).where(this.byId(spaceId, id)).returning();
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  /** Deletes a file, or a folder with every row under it, queueing their stored files for deletion. Answers the deleted rows. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<{ id: string; kind: string }[] | undefined> {
    return this.write(spaceId, tx, async t => {
      const current = await this.find(t, spaceId, id);
      if (!current) return undefined;
      const path = folderPath(current);
      const scope =
        current.kind === 'FOLDER'
          ? or(eq(assets.id, id), eq(assets.parentPath, path), like(assets.parentPath, `${escapeLike(path)}/%`))
          : eq(assets.id, id);
      const rows = await t
        .delete(assets)
        .where(and(eq(assets.spaceId, spaceId), scope))
        .returning({ id: assets.id, kind: assets.kind });
      // Their stored files go through the queue: the sweeper deletes them after the commit.
      await scheduleAssetFilesDeletion(
        t,
        spaceId,
        rows.filter(it => it.kind === 'FILE').map(it => it.id),
      );
      return { result: rows, changed: rows.map(it => ({ id: it.id, op: 'deleted' as const })), bump: true };
    });
  }

  /**
   * Runs `work` in the write's transaction (or the caller's), with the space checked first; then bumps the content
   * version when asked and queues the change events. When `work` finds no asset it answers `undefined` and nothing
   * is bumped.
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
      const outcome = await work(t);
      if (!outcome) return undefined;
      // Resolved content embeds asset name/alt/metadata, so changes to them move the content cache version.
      if (outcome.bump) await bumpContentVersion(t, spaceId);
      for (const it of outcome.changed) await this.events.publish({ spaceId, entity: 'assets', ...it }, t);
      return outcome.result;
    });
  }

  /** The file itself, or every file under a folder (at any depth); `undefined` when there is no asset `id`. */
  async findFileIdsWithin(spaceId: string, id: string): Promise<string[] | undefined> {
    const current = await this.find(this.db, spaceId, id);
    if (!current) return undefined;
    if (current.kind === 'FILE') return [current.id];
    const path = folderPath(current);
    const files = await this.db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          eq(assets.spaceId, spaceId),
          eq(assets.kind, 'FILE'),
          or(eq(assets.parentPath, path), like(assets.parentPath, `${escapeLike(path)}/%`)),
        ),
      );
    return files.map(it => it.id);
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

  /** '' (root) or the path of an existing folder. */
  private async checkParentPath(t: Transaction, spaceId: string, parentPath: string): Promise<void> {
    if (!(await this.folderExists(t, spaceId, parentPath))) throw new BadRequestException(`No folder at '${parentPath}'`);
  }

  private async folderExists(executor: Pick<Database, 'select'>, spaceId: string, parentPath: string): Promise<boolean> {
    if (!parentPath) return true;
    const segments = parentPath.split('/');
    if (!isUuid(segments[segments.length - 1])) return false;
    const [folder] = await executor
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.id, segments[segments.length - 1]), eq(assets.kind, 'FOLDER')));
    return folder !== undefined && folderPath(folder) === parentPath;
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
