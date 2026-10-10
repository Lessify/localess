import type { Readable } from 'node:stream';
import { BadRequestException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, like, or, SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { assets } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { STORAGE_DRIVER, type StorageDriver } from '../../infra/storage/storage.driver.js';
import { bumpVersion, requireSpace } from '../../infra/http/space-access.js';
import { AssetMetadataService } from './asset-metadata.service.js';
import { assetsByIdOrLegacyId } from './asset-ids.js';

export type AssetRow = typeof assets.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface AssetQuery {
  parentPath?: string;
  kind?: 'FOLDER' | 'FILE';
  /** Case-insensitive name prefix. */
  name?: string;
  /** MIME prefix, e.g. `image` or `video`. */
  fileType?: string;
  /** UUIDs, or Firestore ids still referenced by imported content (`legacy_id`). */
  ids?: string[];
  limit?: number;
}

export interface UploadInput {
  parentPath: string;
  file: Readable;
  filename: string;
  mimetype: string;
  name?: string;
  extension?: string;
  alt?: string;
  source?: string;
  /** True when the upload hit the size limit: the stream ended early instead of failing. */
  truncated?: () => boolean;
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, m => `\\${m}`);
/** The path children of `folder` carry as their `parentPath`. */
export const folderPath = (folder: Pick<AssetRow, 'id' | 'parentPath'>) =>
  folder.parentPath ? `${folder.parentPath}/${folder.id}` : folder.id;
const assetPrefix = (spaceId: string, id: string) => `spaces/${spaceId}/assets/${id}/`;

/** Splits `photo.final.JPG` into name `photo.final` and extension `.JPG`, like the upload form did. */
export function splitFilename(filename: string): { name: string; extension: string } {
  const index = filename.lastIndexOf('.');
  return index > 0 ? { name: filename.substring(0, index), extension: filename.substring(index) } : { name: filename, extension: '' };
}

/**
 * Asset library of a space (was direct `spaces/{s}/assets` access, browser uploads to Storage, and
 * the upload/delete triggers). Files are stored under `spaces/{s}/assets/{id}/original`.
 */
@Injectable()
export class AssetsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
    private readonly metadata: AssetMetadataService,
    private readonly events: EventsService,
  ) {}

  async list(spaceId: string, query: AssetQuery): Promise<AssetRow[]> {
    const conditions: SQL[] = [eq(assets.spaceId, spaceId)];
    // The editor asks for the assets content references, which may be Firestore ids in imported content.
    if (query.parentPath !== undefined) conditions.push(eq(assets.parentPath, query.parentPath));
    if (query.kind) conditions.push(eq(assets.kind, query.kind));
    if (query.name) conditions.push(ilike(assets.name, `${escapeLike(query.name)}%`));
    // Folders stay visible while browsing by file type.
    if (query.fileType) conditions.push(or(eq(assets.kind, 'FOLDER'), like(assets.type, `${escapeLike(query.fileType)}%`)) as SQL);
    if (query.ids) conditions.push(assetsByIdOrLegacyId(spaceId, query.ids));
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

  async get(spaceId: string, id: string, executor: Pick<Database, 'select'> = this.db): Promise<AssetRow> {
    if (!isUuid(id)) throw new NotFoundException('Asset not found');
    const [row] = await executor
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.id, id)));
    if (!row) throw new NotFoundException('Asset not found');
    return row;
  }

  /** '' (root) or the path of an existing folder. */
  private async checkParentPath(executor: Pick<Database, 'select'>, spaceId: string, parentPath: string): Promise<void> {
    if (!parentPath) return;
    const segments = parentPath.split('/');
    if (!isUuid(segments[segments.length - 1])) throw new BadRequestException(`No folder at '${parentPath}'`);
    const [folder] = await executor
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), eq(assets.id, segments[segments.length - 1]), eq(assets.kind, 'FOLDER')));
    if (!folder || folderPath(folder) !== parentPath) throw new BadRequestException(`No folder at '${parentPath}'`);
  }

  private async write<T>(
    spaceId: string,
    work: (tx: Transaction) => Promise<{ result: T; changed: { id: string; op: 'created' | 'updated' | 'deleted' }[]; bump?: boolean }>,
  ): Promise<T> {
    return this.db.transaction(async tx => {
      await requireSpace(tx, spaceId);
      const { result, changed, bump } = await work(tx);
      // Resolved content embeds asset name/alt/metadata, so changes to them move the content cache version.
      if (bump) await bumpVersion(tx, spaceId, 'content');
      for (const it of changed) await this.events.publish({ spaceId, entity: 'assets', ...it }, tx);
      return result;
    });
  }

  createFolder(spaceId: string, parentPath: string, name: string): Promise<AssetRow> {
    return this.write(spaceId, async tx => {
      await this.checkParentPath(tx, spaceId, parentPath);
      const [row] = await tx.insert(assets).values({ id: newUuid(), spaceId, kind: 'FOLDER', name, parentPath }).returning();
      return { result: row, changed: [{ id: row.id, op: 'created' }] };
    });
  }

  /**
   * Streams the file into storage, reads its metadata, then creates the row — so there is never a
   * row without its file (the old flow created the row first, `inProgress`, and let a trigger finish it).
   */
  async upload(spaceId: string, input: UploadInput): Promise<AssetRow> {
    await requireSpace(this.db, spaceId);
    await this.checkParentPath(this.db, spaceId, input.parentPath);
    const id = newUuid();
    const key = `spaces/${spaceId}/assets/${id}/original`;
    try {
      const stored = await this.storage.put(key, input.file);
      // @fastify/multipart ends a piped stream at the size limit rather than erroring, so a cut-off
      // file would otherwise be stored as if it were complete.
      if (input.truncated?.()) throw new PayloadTooLargeException('File is too large');
      const derived = splitFilename(input.filename);
      const type = input.mimetype || 'application/octet-stream';
      const extracted = await this.metadata.extract(key, type, input.alt);
      return await this.write(spaceId, async tx => {
        const [row] = await tx
          .insert(assets)
          .values({
            id,
            spaceId,
            kind: 'FILE',
            name: input.name || derived.name,
            extension: input.extension ?? derived.extension,
            type,
            size: stored.size,
            md5: stored.md5,
            parentPath: input.parentPath,
            alt: input.alt || extracted.alt || null,
            source: input.source || null,
            metadata: extracted.metadata ?? null,
          })
          .returning();
        return { result: row, changed: [{ id, op: 'created' }] };
      });
    } catch (error) {
      await this.storage.deletePrefix(assetPrefix(spaceId, id));
      throw error;
    }
  }

  /** Name for folders; name and alt for files (empty alt removes it). */
  update(spaceId: string, id: string, input: { name?: string; alt?: string }): Promise<AssetRow> {
    return this.write(spaceId, async tx => {
      const current = await this.get(spaceId, id, tx);
      const [row] = await tx
        .update(assets)
        .set({
          name: input.name ?? current.name,
          ...(current.kind === 'FILE' && input.alt !== undefined ? { alt: input.alt || null } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(assets.spaceId, spaceId), eq(assets.id, id)))
        .returning();
      return { result: row, changed: [{ id, op: 'updated' }], bump: true };
    });
  }

  /** Files only: a folder's descendants carry its path, so moving one would orphan them. */
  move(spaceId: string, id: string, parentPath: string): Promise<AssetRow> {
    return this.write(spaceId, async tx => {
      const current = await this.get(spaceId, id, tx);
      if (current.kind !== 'FILE') throw new BadRequestException('Only files can be moved');
      await this.checkParentPath(tx, spaceId, parentPath);
      const [row] = await tx
        .update(assets)
        .set({ parentPath, updatedAt: new Date() })
        .where(and(eq(assets.spaceId, spaceId), eq(assets.id, id)))
        .returning();
      return { result: row, changed: [{ id, op: 'updated' }] };
    });
  }

  /** Deletes a file, or a folder with everything under it, rows and stored files alike. */
  async delete(spaceId: string, id: string): Promise<void> {
    const deleted = await this.write(spaceId, async tx => {
      const current = await this.get(spaceId, id, tx);
      const path = folderPath(current);
      const scope =
        current.kind === 'FOLDER'
          ? or(eq(assets.id, id), eq(assets.parentPath, path), like(assets.parentPath, `${escapeLike(path)}/%`))
          : eq(assets.id, id);
      const rows = await tx
        .delete(assets)
        .where(and(eq(assets.spaceId, spaceId), scope))
        .returning({ id: assets.id, kind: assets.kind });
      return { result: rows, changed: rows.map(it => ({ id: it.id, op: 'deleted' as const })), bump: true };
    });
    // After the commit: a failed delete must not leave rows pointing at missing files.
    for (const row of deleted) {
      if (row.kind === 'FILE') await this.storage.deletePrefix(assetPrefix(spaceId, row.id));
    }
  }
}
