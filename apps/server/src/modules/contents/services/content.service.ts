import { type Content, type ContentData, type ContentFolderSummary, WebhookEvent } from '@localess/shared';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { contentRefs } from '../../../shared/data-rules/content-refs.js';
import { SpaceLookupRepository } from '../../../shared/repositories/space-lookup.repository.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { toContent } from '../../../shared/transformers/content.transformer.js';
import { toDto } from '../../../shared/transformers/dto.transformer.js';
import { type ContentQuery, ContentRepository, type ContentWithPath } from '../repositories/content.repository.js';
import { randomSuffix } from '../utils/slug.utils.js';

function found<T>(result: T | undefined): T {
  if (result === undefined) throw new NotFoundException('Content not found');
  return result;
}

/**
 * Content tree of a space, linked by `parent_id` (the repository, in the write's transaction): a rename or move
 * changes one row, a delete takes the subtree. The service words the repository's refusals (400/409) and fires the
 * webhooks as before, only after the commit, so receivers never see (or fetch) uncommitted state.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly webhookDispatcher: WebhookDispatcher,
    private readonly spaceLookupRepository: SpaceLookupRepository,
  ) {}

  async findAll(spaceId: string, query: ContentQuery): Promise<Content[]> {
    await this.requireSpace(spaceId);
    return (await this.contentRepository.findAll(spaceId, query)).map(toContent);
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    await this.requireSpace(spaceId);
    return this.contentRepository.count(spaceId, kind);
  }

  async findOne(spaceId: string, contentId: string): Promise<Content> {
    return toContent(await this.requireContent(spaceId, contentId));
  }

  /** Every folder of the space: the editor builds its breadcrumbs, paths and move targets from them. */
  async findFolders(spaceId: string): Promise<ContentFolderSummary[]> {
    await this.requireSpace(spaceId);
    return (await this.contentRepository.findFolders(spaceId)).map(it => toDto(it) as unknown as ContentFolderSummary);
  }

  /**
   * The parent must be a folder of the space (absent: the root), the slug free among its siblings, and a document's
   * schema a ROOT schema of the space.
   */
  async create(
    spaceId: string,
    input: {
      kind: 'FOLDER' | 'DOCUMENT';
      parentId?: string | null;
      name: string;
      slug: string;
      schema?: string;
      data?: ContentData;
    },
  ): Promise<Content> {
    await this.requireSpace(spaceId);
    const result = await this.contentRepository.create(spaceId, input);
    if ('noSchema' in result) throw new BadRequestException(`No ROOT schema '${input.schema}' in the space`);
    if ('noParent' in result) throw new BadRequestException('No such folder');
    if ('taken' in result) throw new ConflictException(`'${result.taken}' is already used`);
    return toContent(result.content);
  }

  /** A copy next to the original with a random suffix, never published. */
  async clone(spaceId: string, contentId: string): Promise<Content> {
    const source = await this.requireContent(spaceId, contentId);
    if (source.kind !== 'DOCUMENT') throw new BadRequestException('Only documents can be cloned');
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
    await this.requireContent(spaceId, contentId);
    const result = found(await this.contentRepository.update(spaceId, contentId, input));
    if ('noParent' in result) throw new BadRequestException('No such folder');
    if ('taken' in result) throw new ConflictException(`'${result.taken}' is already used`);
    if ('intoItself' in result) throw new BadRequestException('A folder cannot be moved into itself');
    // As before: a document edit that keeps its path is a `content.changed`; a move is not.
    if (!result.moved && result.content.kind === 'DOCUMENT') this.changed(spaceId, result.content);
    return toContent(result.content);
  }

  /** Saves the editor's data, with the ids it points to worked out here (`contentRefs`), not taken from the client. */
  async updateData(spaceId: string, contentId: string, data: ContentData): Promise<Content> {
    await this.requireContent(spaceId, contentId);
    const content = found(await this.contentRepository.updateData(spaceId, contentId, { data, ...contentRefs(data) }));
    if ('notDocument' in content) throw new BadRequestException('Only documents have data');
    this.changed(spaceId, content);
    return toContent(content);
  }

  /** Deletes the item and, for a folder, everything under it. Published snapshots cascade. */
  async remove(spaceId: string, contentId: string): Promise<void> {
    await this.requireContent(spaceId, contentId);
    const deleted = found(await this.contentRepository.delete(spaceId, contentId));
    // The delete trigger fired `content.changed` once per deleted item.
    for (const it of deleted) this.changed(spaceId, it);
  }

  /**
   * Publish a document (one snapshot per space locale), or every document under a folder that changed
   * since it was last published. `updatedAt` is left alone so "changed since publish" keeps working.
   */
  async publish(spaceId: string, contentId: string): Promise<void> {
    await this.requireContent(spaceId, contentId);
    const target = found(await this.contentRepository.publish(spaceId, contentId));
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.CONTENT_PUBLISHED, { id: contentId, fullSlug: target.fullSlug });
  }

  /** Stops serving a document (or every published document under a folder). */
  async unpublish(spaceId: string, contentId: string): Promise<void> {
    await this.requireContent(spaceId, contentId);
    const target = found(await this.contentRepository.unpublish(spaceId, contentId));
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.CONTENT_UNPUBLISHED, { id: contentId, fullSlug: target.fullSlug });
  }

  /** 404 "Space not found" when the space is not there: every App API route checks it first. */
  private async requireSpace(spaceId: string): Promise<void> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
  }

  /** The space first, then its content (404 "Content not found", also for a content of another space). */
  private async requireContent(spaceId: string, contentId: string): Promise<ContentWithPath> {
    await this.requireSpace(spaceId);
    return found(await this.contentRepository.findById(spaceId, contentId));
  }

  private changed(spaceId: string, content: Pick<ContentWithPath, 'id' | 'fullSlug'>): void {
    this.webhookDispatcher.dispatch(spaceId, WebhookEvent.CONTENT_CHANGED, { id: content.id, fullSlug: content.fullSlug });
  }
}
