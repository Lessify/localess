import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull, or } from 'drizzle-orm';
import { ContentKind } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import {
  assets,
  contentLinkSnapshots,
  contents,
  contentSnapshots,
  schemas,
  type SnapshotVersion,
} from '../../../infra/database/schema.js';
import { transaction, type Transaction } from '../../../infra/database/transaction.js';
import { lockContents } from '../../../shared/data-rules/content-snapshots.js';
import { type ContentWithPath, findIdByPath, folderPaths, withPaths } from '../../../shared/queries/content-tree.query.js';
import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
import { toContentMetadata } from '../../../shared/transformers/content.transformer.js';
import { buildDocumentStorage } from '../utils/content-extract.js';

export type AssetEntity = typeof assets.$inferSelect;
export type SchemaEntity = typeof schemas.$inferSelect;
export type ContentSnapshotEntity = Pick<typeof contentSnapshots.$inferSelect, 'contentId' | 'data' | 'builtAt'>;
export type ContentLinkSnapshotEntity = typeof contentLinkSnapshots.$inferSelect;

/**
 * The reads of the public v1 content API: the stored snapshots (`content_snapshots`, `content_link_snapshots`), built
 * when a write dropped them (content-snapshots.ts, which also explains the lock), and the link and asset targets.
 * Callers pass ids that are UUIDs.
 */
@Injectable()
export class ContentDeliveryRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The item at `fullSlug`, by its path segments (content-tree.query.ts). */
  findIdByFullSlug(spaceId: string, fullSlug: string): Promise<string | undefined> {
    return findIdByPath(this.db, spaceId, fullSlug);
  }

  /** The published snapshots of `ids` in `locale`; documents never published (in it) are absent. */
  findPublished(spaceId: string, ids: string[], locale: string): Promise<ContentSnapshotEntity[]> {
    return this.findSnapshots(this.db, spaceId, 'published', ids, locale);
  }

  /** The drafts of `ids` in `locale`, building the missing ones; ids that are no document of the space are absent. */
  async findDrafts(spaceId: string, ids: string[], locale: string): Promise<ContentSnapshotEntity[]> {
    const stored = await this.findSnapshots(this.db, spaceId, 'draft', ids, locale);
    if (stored.length === ids.length) return stored;
    return transaction(this.db, undefined, async t => {
      await lockContents(t, spaceId);
      const built = await this.findSnapshots(t, spaceId, 'draft', ids, locale);
      const have = new Set(built.map(it => it.contentId));
      const missing = ids.filter(id => !have.has(id));
      const documents = await t
        .select()
        .from(contents)
        .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, missing), eq(contents.kind, ContentKind.DOCUMENT)));
      if (!documents.length) return built;
      const folders = await folderPaths(t, spaceId);
      const schemaByName = schemasByName(await t.select().from(schemas).where(eq(schemas.spaceId, spaceId)));
      const builtAt = new Date();
      const rows = withPaths(documents, folders).map(document => ({
        spaceId,
        contentId: document.id,
        version: 'draft' as const,
        locale,
        data: buildDocumentStorage(document, schemaByName, locale),
        builtAt,
      }));
      await t.insert(contentSnapshots).values(rows);
      return [...built, ...rows];
    });
  }

  /**
   * The `/links` list of `version`, built when a write dropped it: every folder and document (draft), or every folder
   * and the published documents (published), as metadata keyed by id, in id order (creation order).
   */
  async findLinks(spaceId: string, version: SnapshotVersion): Promise<ContentLinkSnapshotEntity> {
    const stored = await this.findLinkSnapshot(this.db, spaceId, version);
    if (stored) return stored;
    return transaction(this.db, undefined, async t => {
      await lockContents(t, spaceId);
      const built = await this.findLinkSnapshot(t, spaceId, version);
      if (built) return built;
      const rows = await t
        .select()
        .from(contents)
        .where(
          and(
            eq(contents.spaceId, spaceId),
            version === 'published' ? or(eq(contents.kind, ContentKind.FOLDER), isNotNull(contents.publishedAt)) : undefined,
          ),
        )
        .orderBy(asc(contents.id)); // UUIDs: byte order is creation order
      const snapshot = {
        spaceId,
        version,
        data: Object.fromEntries(withPaths(rows, await folderPaths(t, spaceId)).map(row => [row.id, toContentMetadata(row)])),
        builtAt: new Date(),
      };
      await t.insert(contentLinkSnapshots).values(snapshot);
      return snapshot;
    });
  }

  /** Link targets, with their paths. */
  async findContents(spaceId: string, ids: string[]): Promise<ContentWithPath[]> {
    const rows = await this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, ids)));
    return withPaths(rows, await folderPaths(this.db, spaceId));
  }

  findAssets(spaceId: string, ids: string[]): Promise<AssetEntity[]> {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, ids)));
  }

  private async findSnapshots(
    executor: Pick<Database, 'select'> | Transaction,
    spaceId: string,
    version: SnapshotVersion,
    ids: string[],
    locale: string,
  ): Promise<ContentSnapshotEntity[]> {
    if (!ids.length) return [];
    return executor
      .select({ contentId: contentSnapshots.contentId, data: contentSnapshots.data, builtAt: contentSnapshots.builtAt })
      .from(contentSnapshots)
      .where(
        and(
          eq(contentSnapshots.spaceId, spaceId),
          eq(contentSnapshots.version, version),
          eq(contentSnapshots.locale, locale),
          inArray(contentSnapshots.contentId, ids),
        ),
      );
  }

  private async findLinkSnapshot(
    executor: Pick<Database, 'select'> | Transaction,
    spaceId: string,
    version: SnapshotVersion,
  ): Promise<ContentLinkSnapshotEntity | undefined> {
    const [row] = await executor
      .select()
      .from(contentLinkSnapshots)
      .where(and(eq(contentLinkSnapshots.spaceId, spaceId), eq(contentLinkSnapshots.version, version)));
    return row;
  }
}
