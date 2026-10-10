import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, or, sql, SQL } from 'drizzle-orm';
import { AssetMetadata, ContentDocumentApi, ContentDocumentStorage, ContentKind, ContentMetadata, Schema } from '@localess/shared';
import { assetsByIdOrLegacyId, indexAssets } from '../assets/asset-ids.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { assets, contentPublished, contents, schemas } from '../../infra/database/schema.js';
import { SpaceRow } from '../../infra/http/space-access.js';
import { isDraft } from '../../infra/http/v1/v1-request.js';
import { buildDocumentStorage } from './content-extract.js';
import { isValidId } from '../../infra/http/v1/id-param.js';
import { stripStorageIds } from './strip-storage-ids.js';

type ContentRow = typeof contents.$inferSelect;

/** LIKE pattern for "starts with `prefix`", with LIKE metacharacters escaped. */
const startsWith = (prefix: string) => `${prefix.replace(/[\\%_]/g, m => `\\${m}`)}%`;

function toContentMetadata(row: ContentRow): ContentMetadata {
  const link: ContentMetadata = {
    id: row.id,
    kind: row.kind as ContentKind,
    name: row.name,
    slug: row.slug,
    fullSlug: row.fullSlug,
    parentSlug: row.parentSlug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (row.kind === ContentKind.DOCUMENT) {
    link.publishedAt = row.publishedAt?.toISOString();
  }
  return link;
}

/**
 * Content reads for the public v1 API. Published documents come from the snapshots taken at publish
 * time; drafts are built from the live rows on read (they used to be files rewritten on every save).
 */
@Injectable()
export class ContentDeliveryService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findContentIdByFullSlug(spaceId: string, fullSlug: string): Promise<string | undefined> {
    const [row] = await this.db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.fullSlug, fullSlug)))
      .limit(1);
    return row?.id;
  }

  private async schemaMap(spaceId: string): Promise<Map<string, Schema>> {
    const rows = await this.db.select().from(schemas).where(eq(schemas.spaceId, spaceId));
    return new Map(rows.map(row => [row.name, row as unknown as Schema]));
  }

  /** Locale documents for `ids` (published snapshot, or draft built from the row). Missing ones are absent. */
  private async localeDocuments(
    spaceId: string,
    ids: string[],
    locale: string,
    draft: boolean,
  ): Promise<Map<string, ContentDocumentStorage>> {
    const result = new Map<string, ContentDocumentStorage>();
    if (!ids.length) return result;
    if (!draft) {
      const rows = await this.db
        .select({ contentId: contentPublished.contentId, data: contentPublished.data })
        .from(contentPublished)
        .where(and(eq(contentPublished.spaceId, spaceId), inArray(contentPublished.contentId, ids), eq(contentPublished.locale, locale)));
      for (const row of rows) result.set(row.contentId, row.data as unknown as ContentDocumentStorage);
      return result;
    }
    const rows = await this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, ids), eq(contents.kind, ContentKind.DOCUMENT)));
    if (!rows.length) return result;
    const schemaById = await this.schemaMap(spaceId);
    for (const row of rows) result.set(row.id, buildDocumentStorage(row, schemaById, locale));
    return result;
  }

  /**
   * The document in `locale`, else in the space's fallback locale (what `resolveLocaleFilePath` did
   * with the two Storage files). `resolvedLocale` says which one was found.
   */
  async findLocaleDocument(
    space: SpaceRow,
    contentId: string,
    locale: string,
    version: unknown,
  ): Promise<{ document: ContentDocumentStorage; resolvedLocale: string } | undefined> {
    const draft = isDraft(version);
    const primary = (await this.localeDocuments(space.id, [contentId], locale, draft)).get(contentId);
    if (primary) return { document: primary, resolvedLocale: locale };
    const fallbackLocale = space.localeFallback.id;
    if (fallbackLocale === locale) return undefined;
    const fallback = (await this.localeDocuments(space.id, [contentId], fallbackLocale, draft)).get(contentId);
    return fallback ? { document: fallback, resolvedLocale: fallbackLocale } : undefined;
  }

  /** Resolved `references`, one level deep, without their own id arrays. Same locale, no fallback. */
  async resolveReferences(spaceId: string, ids: string[], locale: string, version: unknown): Promise<Record<string, ContentDocumentApi>> {
    // A malformed stored id is skipped like a missing one rather than failing the whole response.
    const valid = [...new Set(ids.filter(id => id && isValidId(id)))];
    const found = await this.localeDocuments(spaceId, valid, locale, isDraft(version));
    const resolved: Record<string, ContentDocumentApi> = {};
    for (const id of valid) {
      const document = found.get(id);
      if (document) resolved[id] = stripStorageIds(document) as ContentDocumentApi;
    }
    return resolved;
  }

  /** Link targets' metadata; deleted targets are skipped. */
  async resolveLinks(spaceId: string, ids: string[]): Promise<Record<string, ContentMetadata>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return {};
    const rows = await this.db
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.id, unique)));
    const byId = new Map(rows.map(row => [row.id, row]));
    const resolved: Record<string, ContentMetadata> = {};
    for (const id of unique) {
      const row = byId.get(id);
      if (row) resolved[id] = toContentMetadata(row);
    }
    return resolved;
  }

  /** Asset metadata for FILE assets; folders and deleted assets are skipped. */
  async resolveAssets(spaceId: string, ids: string[]): Promise<Record<string, AssetMetadata>> {
    const unique = [...new Set(ids)];
    if (!unique.length) return {};
    const rows = await this.db
      .select()
      .from(assets)
      .where(assetsByIdOrLegacyId(spaceId, unique));
    // Imported content may still reference an asset by its Firestore id; the result is keyed by the id asked for.
    const byId = indexAssets(rows);
    const resolved: Record<string, AssetMetadata> = {};
    for (const id of unique) {
      const asset = byId.get(id);
      if (!asset || asset.kind !== 'FILE') continue;
      const contentAsset: AssetMetadata = {
        id: asset.id,
        name: asset.name,
        extension: asset.extension ?? '',
        type: asset.type ?? '',
        size: asset.size ?? 0,
      };
      if (asset.alt) contentAsset.alt = asset.alt;
      // Not forwarded on purpose: orientation, format, metadata.type and source (see the functions-era comment).
      const metadata = asset.metadata as { width?: number; height?: number; duration?: unknown } | null;
      if (metadata) {
        if (metadata.width !== undefined) contentAsset.width = metadata.width;
        if (metadata.height !== undefined) contentAsset.height = metadata.height;
        if (typeof metadata.duration === 'number') contentAsset.duration = metadata.duration;
      }
      resolved[id] = contentAsset;
    }
    return resolved;
  }

  /**
   * `GET /links`. `parentSlug` selects a folder's subtree (or only its direct children with
   * `excludeChildren`); without it, the whole space (or the root level).
   *
   * The subtree used to be the Firestore range `parentSlug >= p AND < p + "/~"`, which also matched
   * sibling folders sharing the prefix (`blog-archive` under `blog`). It is now an exact prefix match.
   */
  async listLinks(
    spaceId: string,
    filter: { parentSlug?: string; excludeChildren: boolean; kind?: ContentKind },
  ): Promise<Record<string, ContentMetadata>> {
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
    const rows = await this.db
      .select()
      .from(contents)
      .where(and(...conditions))
      .orderBy(sql`${contents.id} collate "C"`);
    return Object.fromEntries(rows.map(row => [row.id, toContentMetadata(row)]));
  }
}
