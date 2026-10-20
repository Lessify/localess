import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type Content, type ContentData, type ContentFolderSummary, WebHookEvent } from '@localess/shared';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { toContent } from '../../../shared/transformers/content.transformer.js';
import { toDto } from '../../../shared/transformers/dto.transformer.js';
import { contentRefs } from '../../../shared/data-rules/content-refs.js';
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
  ) {}

  async findAll(spaceId: string, query: ContentQuery): Promise<Content[]> {
    return (await this.contentRepository.findAll(spaceId, query)).map(toContent);
  }

  count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    return this.contentRepository.count(spaceId, kind);
  }

  async findOne(spaceId: string, id: string): Promise<Content> {
    return toContent(found(await this.contentRepository.findById(spaceId, id)));
  }

  /** Every folder of the space: the editor builds its breadcrumbs, paths and move targets from them. */
  async findFolders(spaceId: string): Promise<ContentFolderSummary[]> {
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
    const result = await this.contentRepository.create(spaceId, input);
    if ('noSchema' in result) throw new BadRequestException(`No ROOT schema '${input.schema}' in the space`);
    if ('noParent' in result) throw new BadRequestException('No such folder');
    if ('taken' in result) throw new ConflictException(`'${result.taken}' is already used`);
    return toContent(result.content);
  }

  /** A copy next to the original with a random suffix, never published. */
  async clone(spaceId: string, id: string): Promise<Content> {
    const source = found(await this.contentRepository.findById(spaceId, id));
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
  async update(spaceId: string, id: string, input: { name?: string; slug?: string; parentId?: string | null }): Promise<Content> {
    const result = found(await this.contentRepository.update(spaceId, id, input));
    if ('noParent' in result) throw new BadRequestException('No such folder');
    if ('taken' in result) throw new ConflictException(`'${result.taken}' is already used`);
    if ('intoItself' in result) throw new BadRequestException('A folder cannot be moved into itself');
    // As before: a document edit that keeps its path is a `content.changed`; a move is not.
    if (!result.moved && result.content.kind === 'DOCUMENT') this.changed(spaceId, result.content);
    return toContent(result.content);
  }

  /** Saves the editor's data, with the ids it points to worked out here (`contentRefs`), not taken from the client. */
  async updateData(spaceId: string, id: string, data: ContentData): Promise<Content> {
    const content = found(await this.contentRepository.updateData(spaceId, id, { data, ...contentRefs(data) }));
    if ('notDocument' in content) throw new BadRequestException('Only documents have data');
    this.changed(spaceId, content);
    return toContent(content);
  }

  /** Deletes the item and, for a folder, everything under it. Published snapshots cascade. */
  async remove(spaceId: string, id: string): Promise<void> {
    const deleted = found(await this.contentRepository.delete(spaceId, id));
    // The delete trigger fired `content.changed` once per deleted item.
    for (const it of deleted) this.changed(spaceId, it);
  }

  /**
   * Publish a document (one snapshot per space locale), or every document under a folder that changed
   * since it was last published. `updatedAt` is left alone so "changed since publish" keeps working.
   */
  async publish(spaceId: string, id: string): Promise<void> {
    const target = found(await this.contentRepository.publish(spaceId, id));
    this.webhookDispatcher.dispatch(spaceId, WebHookEvent.CONTENT_PUBLISHED, { id, fullSlug: target.fullSlug });
  }

  /** Stops serving a document (or every published document under a folder). */
  async unpublish(spaceId: string, id: string): Promise<void> {
    const target = found(await this.contentRepository.unpublish(spaceId, id));
    this.webhookDispatcher.dispatch(spaceId, WebHookEvent.CONTENT_UNPUBLISHED, { id, fullSlug: target.fullSlug });
  }

  private changed(spaceId: string, content: Pick<ContentWithPath, 'id' | 'fullSlug'>): void {
    this.webhookDispatcher.dispatch(spaceId, WebHookEvent.CONTENT_CHANGED, { id: content.id, fullSlug: content.fullSlug });
  }
}
