import { schemasByName } from '../../../shared/transformers/schema.transformer.js';
import { Injectable } from '@nestjs/common';
import { AssetMetadata, ContentDocumentApi, ContentDocumentStorage, ContentMetadata } from '@localess/shared';
import { isUuid } from '../../../infra/database/id.js';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { toAssetMetadata, toContentMetadata } from '../../../shared/transformers/content.transformer.js';
import { isDraft } from '../../../infra/http/v1/v1-request.js';
import { ContentDeliveryRepository, type LinkFilter } from '../repositories/content-delivery.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { buildDocumentStorage } from '../utils/content-extract.js';
import { stripStorageIds } from '../utils/strip-storage-ids.js';

/**
 * Content reads for the public v1 API. Published documents come from the snapshots taken at publish
 * time; drafts are built from the live rows on read (they used to be files rewritten on every save).
 */
@Injectable()
export class ContentDeliveryService {
  constructor(
    private readonly delivery: ContentDeliveryRepository,
    private readonly spaces: SpaceRepository,
  ) {}

  findSpace(spaceId: string): Promise<SpaceRow | undefined> {
    return this.spaces.find(spaceId);
  }

  findContentIdByFullSlug(spaceId: string, fullSlug: string): Promise<string | undefined> {
    return this.delivery.findIdByFullSlug(spaceId, fullSlug);
  }

  /** Locale documents for `ids` (published snapshot, or draft built from the row). Missing ones are absent. */
  private async localeDocuments(
    spaceId: string,
    ids: string[],
    locale: string,
    draft: boolean,
  ): Promise<Map<string, ContentDocumentStorage>> {
    const result = new Map<string, ContentDocumentStorage>();
    ids = ids.filter(isUuid);
    if (!ids.length) return result;
    if (!draft) {
      const rows = await this.delivery.findPublished(spaceId, ids, locale);
      for (const row of rows) result.set(row.contentId, row.data as unknown as ContentDocumentStorage);
      return result;
    }
    const rows = await this.delivery.findDocuments(spaceId, ids);
    if (!rows.length) return result;
    const schemaById = schemasByName(await this.delivery.findSchemas(spaceId));
    for (const row of rows) result.set(row.id, buildDocumentStorage(row, schemaById, locale));
    return result;
  }

  /**
   * The document in `locale`, else in the space's default locale (what `resolveLocaleFilePath` did
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
    const fallbackLocale = space.defaultLocaleId;
    if (fallbackLocale === locale) return undefined;
    const fallback = (await this.localeDocuments(space.id, [contentId], fallbackLocale, draft)).get(contentId);
    return fallback ? { document: fallback, resolvedLocale: fallbackLocale } : undefined;
  }

  /** Resolved `references`, one level deep, without their own id arrays. Same locale, no fallback. */
  async resolveReferences(spaceId: string, ids: string[], locale: string, version: unknown): Promise<Record<string, ContentDocumentApi>> {
    // A malformed stored id is skipped like a missing one rather than failing the whole response.
    const valid = [...new Set(ids.filter(isUuid))];
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
    const unique = [...new Set(ids.filter(isUuid))];
    if (!unique.length) return {};
    const rows = await this.delivery.findContents(spaceId, unique);
    return Object.fromEntries(rows.map(row => [row.id, toContentMetadata(row)]));
  }

  /** Asset metadata for FILE assets; folders and deleted assets are skipped. */
  async resolveAssets(spaceId: string, ids: string[]): Promise<Record<string, AssetMetadata>> {
    const unique = [...new Set(ids.filter(isUuid))];
    if (!unique.length) return {};
    const rows = await this.delivery.findAssets(spaceId, unique);
    const byId = new Map(rows.map(row => [row.id, row]));
    const resolved: Record<string, AssetMetadata> = {};
    for (const id of unique) {
      const asset = byId.get(id);
      if (!asset || asset.kind !== 'FILE') continue;
      resolved[id] = toAssetMetadata(asset);
    }
    return resolved;
  }

  /** `GET /links` (see `ContentDeliveryRepository.findLinks` for the filter). */
  async listLinks(spaceId: string, filter: LinkFilter): Promise<Record<string, ContentMetadata>> {
    const rows = await this.delivery.findLinks(spaceId, filter);
    return Object.fromEntries(rows.map(row => [row.id, toContentMetadata(row)]));
  }
}
