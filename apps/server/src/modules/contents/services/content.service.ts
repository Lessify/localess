import {
  type Content,
  type ContentData,
  type ContentDocumentSummary,
  type ContentFolderSummary,
  type ContentPageable,
  type Page,
  WebhookEvent,
} from '@localess/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { contentRefs } from '../../../shared/data-rules/content-refs.js';
import type { SpaceWithLocales } from '../../../shared/entities/space.entity.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { toContent, toContentDocumentSummary, toContentFolderSummary } from '../../../shared/transformers/content.transformer.js';
import { toPage } from '../../../shared/utils/paging.js';
import { ContentRepository, type ContentWithPath, type NewContent } from '../repositories/content.repository.js';
import { contentErrors } from '../utils/content-errors.js';
import { randomSuffix } from '../utils/slug.utils.js';

function found<T>(result: T | undefined): T {
  if (result === undefined) throw new NotFoundException('Content not found');
  return result;
}

/**
 * Content tree of a space, linked by `parent_id`: a rename or move changes one row, a delete takes the subtree. Every
 * route checks the space first, then the content; a write checks what it can from what it read, writes (the repository
 * checks the tree's rules again under the contents lock, with the same messages) and reads the content again. Webhooks
 * fire as before, only after the commit, so receivers never see (or fetch) uncommitted state.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  /** One page of a folder (or everything under it), without the documents' data. */
  async findAll(spaceId: string, query: ContentPageable): Promise<Page<Content>> {
    await this.requireSpace(spaceId);
    const [rows, total] = await Promise.all([
      this.contentRepository.findAll(spaceId, query),
      this.contentRepository.findAllCount(spaceId, query),
    ]);
    return toPage(rows, total, query, toContent);
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    await this.requireSpace(spaceId);
    return this.contentRepository.count(spaceId, kind);
  }

  async findOne(spaceId: string, contentId: string): Promise<Content> {
    return toContent(await this.requireContent(spaceId, contentId));
  }

  /** Every folder of the space, light: the editor's breadcrumbs, move targets and the documents' paths. */
  async findFolders(spaceId: string): Promise<ContentFolderSummary[]> {
    await this.requireSpace(spaceId);
    return (await this.contentRepository.findFolders(spaceId)).map(toContentFolderSummary);
  }

  /** Every document of the space, light (no data): the Link and References fields, the names a folder has. */
  async findDocuments(spaceId: string): Promise<ContentDocumentSummary[]> {
    await this.requireSpace(spaceId);
    return (await this.contentRepository.findDocuments(spaceId)).map(toContentDocumentSummary);
  }

  /**
   * The parent must be a folder of the space (absent: the root), the slug free among its siblings, and a document's
   * schema a ROOT schema of the space (the repository checks them under the contents lock).
   */
  async create(spaceId: string, input: NewContent): Promise<Content> {
    await this.requireSpace(spaceId);
    return toContent(await this.findContent(spaceId, await this.contentRepository.create(spaceId, input)));
  }

  /** A copy next to the original with a random suffix, never published. */
  async clone(spaceId: string, contentId: string): Promise<Content> {
    const source = await this.requireContent(spaceId, contentId);
    if (source.kind !== 'DOCUMENT') throw new BadRequestException(contentErrors.cloneNotDocument);
    const suffix = randomSuffix();
    return this.create(spaceId, {
      kind: 'DOCUMENT',
      parentId: source.parentId,
      name: `${source.name} ${suffix}`,
      slug: `${source.slug}-${suffix}`,
      schema: source.schema ?? undefined,
      data: source.data ?? undefined,
    });
  }

  /** Rename and/or move (`parentId` null: the root). A folder is not moved under itself. */
  async update(spaceId: string, contentId: string, input: { name?: string; slug?: string; parentId?: string | null }): Promise<Content> {
    const current = await this.requireContent(spaceId, contentId);
    await this.contentRepository.update(spaceId, contentId, input);
    const content = await this.findContent(spaceId, contentId);
    // As before: a document edit that keeps its path is a `content.changed`; a move is not.
    const moved =
      (input.parentId !== undefined && input.parentId !== current.parentId) || (input.slug !== undefined && input.slug !== current.slug);
    if (!moved && content.kind === 'DOCUMENT') this.changed(spaceId, content);
    return toContent(content);
  }

  /** Saves the editor's data, with the ids it points to worked out here (`contentRefs`), not taken from the client. */
  async updateData(spaceId: string, contentId: string, data: ContentData): Promise<Content> {
    const current = await this.requireContent(spaceId, contentId);
    if (current.kind !== 'DOCUMENT') throw new BadRequestException(contentErrors.notDocument);
    await this.contentRepository.updateData(spaceId, contentId, { data, ...contentRefs(data) });
    const content = await this.findContent(spaceId, contentId);
    this.changed(spaceId, content);
    return toContent(content);
  }

  /** Deletes the item and, for a folder, everything under it. Published snapshots cascade. */
  async remove(spaceId: string, contentId: string): Promise<void> {
    await this.requireContent(spaceId, contentId);
    // A `content.changed` per deleted item.
    for (const it of await this.contentRepository.delete(spaceId, contentId)) this.changed(spaceId, it);
  }

  /**
   * Publish a document (one snapshot per space locale), or every document under a folder that changed since it was
   * last published. `updatedAt` is left alone so "changed since publish" keeps working.
   */
  async publish(spaceId: string, contentId: string): Promise<void> {
    const space = await this.requireSpace(spaceId);
    const target = await this.findContent(spaceId, contentId);
    await this.contentRepository.publish(
      spaceId,
      contentId,
      space.spaceLocales.map(it => it.localeId),
    );
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.CONTENT_PUBLISHED, { id: contentId, fullSlug: target.fullSlug });
  }

  /** Stops serving a document (or every published document under a folder). */
  async unpublish(spaceId: string, contentId: string): Promise<void> {
    const target = await this.requireContent(spaceId, contentId);
    await this.contentRepository.unpublish(spaceId, contentId);
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.CONTENT_UNPUBLISHED, { id: contentId, fullSlug: target.fullSlug });
  }

  /** The space with its locales; 404 "Space not found" when it is not there: every App API route checks it first. */
  private async requireSpace(spaceId: string): Promise<SpaceWithLocales> {
    const space = await this.spaceLookupRepository.findOne(spaceId);
    if (!space) throw new NotFoundException('Space not found');
    return space;
  }

  /** The space first, then its content (404 "Content not found", also for a content of another space). */
  private async requireContent(spaceId: string, contentId: string): Promise<ContentWithPath> {
    await this.requireSpace(spaceId);
    return this.findContent(spaceId, contentId);
  }

  /** The content as stored (404 when it went meanwhile). */
  private async findContent(spaceId: string, contentId: string): Promise<ContentWithPath> {
    return found(await this.contentRepository.findOne(spaceId, contentId));
  }

  private changed(spaceId: string, content: Pick<ContentWithPath, 'id' | 'fullSlug'>): void {
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.CONTENT_CHANGED, { id: content.id, fullSlug: content.fullSlug });
  }
}
