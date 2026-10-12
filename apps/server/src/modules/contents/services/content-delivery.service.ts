import { Injectable } from '@nestjs/common';
import { AssetMetadata, ContentDocumentApi, ContentDocumentStorage, ContentKind, ContentMetadata } from '@localess/shared';

import { isUuid } from '../../../infra/database/id.js';
import type { SpaceRow } from '../../../shared/queries/space.query.js';
import { toAssetMetadata, toContentMetadata } from '../../../shared/transformers/content.transformer.js';
import { isDraft } from '../../../infra/http/v1/v1-request.js';
import { ContentDeliveryRepository } from '../repositories/content-delivery.repository.js';
import { SpaceRepository } from '../repositories/space.repository.js';
import { stripStorageIds } from '../utils/strip-storage-ids.js';

export interface LinkFilter {
  parentSlug?: string;
  excludeChildren: boolean;
  kind?: ContentKind;
}

/** A document in one locale as served, and its `cv`. */
export interface LocaleDocument {
  document: ContentDocumentStorage;
  /** The locale found: the requested one, else the space's default locale. */
  resolvedLocale: string;
  builtAt: Date;
}

/**
 * Content reads for the public v1 API, from the stored snapshots: published documents as their publish wrote them,
 * drafts and the `/links` lists built on the first request after a write dropped them. Each answers to its own `cv`,
 * its `built_at`.
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

  /** Snapshots of `ids` in `locale` (published, or drafts built when missing). Missing ones are absent. */
  private async localeDocuments(
    spaceId: string,
    ids: string[],
    locale: string,
    draft: boolean,
  ): Promise<Map<string, { document: ContentDocumentStorage; builtAt: Date }>> {
    ids = [...new Set(ids.filter(isUuid))];
    if (!ids.length) return new Map();
    const rows = draft ? await this.delivery.findDrafts(spaceId, ids, locale) : await this.delivery.findPublished(spaceId, ids, locale);
    return new Map(rows.map(row => [row.contentId, { document: row.data as unknown as ContentDocumentStorage, builtAt: row.builtAt }]));
  }

  /**
   * The document in `locale`, else in the space's default locale (what `resolveLocaleFilePath` did with the two
   * Storage files): a locale added since the publish, or one never published. A draft is built for any locale.
   */
  async findLocaleDocument(space: SpaceRow, contentId: string, locale: string, version: unknown): Promise<LocaleDocument | undefined> {
    const draft = isDraft(version);
    const primary = (await this.localeDocuments(space.id, [contentId], locale, draft)).get(contentId);
    if (primary) return { ...primary, resolvedLocale: locale };
    const fallbackLocale = space.defaultLocaleId;
    if (fallbackLocale === locale) return undefined;
    const fallback = (await this.localeDocuments(space.id, [contentId], fallbackLocale, draft)).get(contentId);
    return fallback ? { ...fallback, resolvedLocale: fallbackLocale } : undefined;
  }

  /** Resolved `references`, one level deep, without their own id arrays. Same locale, no fallback. */
  async resolveReferences(spaceId: string, ids: string[], locale: string, version: unknown): Promise<Record<string, ContentDocumentApi>> {
    // A malformed stored id is skipped like a missing one rather than failing the whole response.
    const valid = [...new Set(ids.filter(isUuid))];
    const found = await this.localeDocuments(spaceId, valid, locale, isDraft(version));
    const resolved: Record<string, ContentDocumentApi> = {};
    for (const id of valid) {
      const document = found.get(id)?.document;
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

  /**
   * `GET /links` of `version` and its `built_at`. `parentSlug` selects a folder's subtree (or only its direct children
   * with `excludeChildren`); without it, the whole space (or the root level).
   *
   * The subtree used to be the Firestore range `parentSlug >= p AND < p + "/~"`, which also matched sibling folders
   * sharing the prefix (`blog-archive` under `blog`). It is an exact prefix match.
   */
  async listLinks(spaceId: string, version: unknown, filter: LinkFilter): Promise<{ links: Record<string, ContentMetadata>; builtAt: Date }> {
    const snapshot = await this.delivery.findLinks(spaceId, isDraft(version) ? 'draft' : 'published');
    const all = Object.values(snapshot.data as Record<string, ContentMetadata>);
    const { parentSlug, excludeChildren, kind } = filter;
    const links = all.filter(
      it =>
        (parentSlug
          ? it.parentSlug === parentSlug || (!excludeChildren && it.parentSlug.startsWith(`${parentSlug}/`))
          : !excludeChildren || it.parentSlug === '') && (!kind || it.kind === kind),
    );
    return { links: Object.fromEntries(links.map(it => [it.id, it])), builtAt: snapshot.builtAt };
  }
}
