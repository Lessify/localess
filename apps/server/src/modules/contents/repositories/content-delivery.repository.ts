import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, or, sql, SQL } from 'drizzle-orm';
import { ContentKind } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { assets, contentPublished, contents, schemas } from '../../../infra/database/schema.js';
import { startsWith } from '../utils/slug.utils.js';
import type { ContentEntity } from './contents.repository.js';

export type AssetEntity = typeof assets.$inferSelect;
export type SchemaEntity = typeof schemas.$inferSelect;
export type PublishedEntity = Pick<typeof contentPublished.$inferSelect, 'contentId' | 'data'>;

export interface LinkFilter {
  parentSlug?: string;
  excludeChildren: boolean;
  kind?: ContentKind;
}

/**
 * The reads of the public v1 content API: published snapshots (`content_published`), the live rows drafts are built
 * from, the schemas they are built with, and the link and asset targets. Callers pass ids that are UUIDs.
 */
@Injectable()
export class ContentDeliveryRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findIdByFullSlug(spaceId: string, fullSlug: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.fullSlug, fullSlug)))
      .limit(1);
    return row?.id;
  }

  findPublished(spaceId: string, ids: string[], locale: string): Promise<PublishedEntity[]> {
    return this.db
      .select({ contentId: contentPublished.contentId, data: contentPublished.data })
      .from(contentPublished)
      .where(and(eq(contentPublished.spaceId, spaceId), inArray(contentPublished.contentId, ids), eq(contentPublished.locale, locale)));
  }

  findDocuments(spaceId: string, ids: string[]): Promise<ContentEntity[]> {
    return this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, ids), eq(contents.kind, ContentKind.DOCUMENT)));
  }

  findSchemas(spaceId: string): Promise<SchemaEntity[]> {
    return this.db.select().from(schemas).where(eq(schemas.spaceId, spaceId));
  }

  findContents(spaceId: string, ids: string[]): Promise<ContentEntity[]> {
    return this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, ids)));
  }

  findAssets(spaceId: string, ids: string[]): Promise<AssetEntity[]> {
    return this.db
      .select()
      .from(assets)
      .where(and(eq(assets.spaceId, spaceId), inArray(assets.id, ids)));
  }

  /**
   * `parentSlug` selects a folder's subtree (or only its direct children with `excludeChildren`); without it, the
   * whole space (or the root level).
   *
   * The subtree used to be the Firestore range `parentSlug >= p AND < p + "/~"`, which also matched
   * sibling folders sharing the prefix (`blog-archive` under `blog`). It is now an exact prefix match.
   */
  findLinks(spaceId: string, filter: LinkFilter): Promise<ContentEntity[]> {
    const conditions: SQL[] = [eq(contents.spaceId, spaceId)];
    if (filter.parentSlug) {
      if (filter.excludeChildren) {
        conditions.push(eq(contents.parentSlug, filter.parentSlug));
      } else {
        conditions.push(
          or(eq(contents.parentSlug, filter.parentSlug), sql`${contents.parentSlug} like ${startsWith(`${filter.parentSlug}/`)}`) as SQL,
        );
      }
    } else if (filter.excludeChildren) {
      conditions.push(eq(contents.parentSlug, ''));
    }
    if (filter.kind) conditions.push(eq(contents.kind, filter.kind));
    return this.db
      .select()
      .from(contents)
      .where(and(...conditions))
      .orderBy(asc(contents.id)); // UUIDs: byte order is creation order
  }
}
