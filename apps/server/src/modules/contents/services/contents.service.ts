import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type Content, WebHookEvent } from '@localess/shared';
import type { UserRow } from '../../../auth/users/users.service.js';
import { WebhookDispatcher } from '../../../shared/services/webhook-dispatcher.service.js';
import { toContent } from '../../../shared/transformers/content.transformer.js';
import { updatedByOf } from '../../../shared/transformers/updated-by.transformer.js';
import { type ContentEntity, type ContentQuery, ContentsRepository } from '../repositories/contents.repository.js';
import { randomSuffix } from '../utils/slug.utils.js';

function found<T>(result: T | undefined): T {
  if (result === undefined) throw new NotFoundException('Content not found');
  return result;
}

/**
 * Content tree of a space. Replaces the SPA's direct Firestore writes and what the content triggers
 * did behind them: every write bumps the content version (was `cache.json`), folder renames cascade
 * to descendants in one statement, deletes take the subtree (the repository, in the write's transaction), and
 * webhooks fire as before. Webhooks go out only after the commit, so receivers never see (or fetch) uncommitted state.
 */
@Injectable()
export class ContentsService {
  constructor(
    private readonly contents: ContentsRepository,
    private readonly webhooks: WebhookDispatcher,
  ) {}

  async list(spaceId: string, query: ContentQuery): Promise<Content[]> {
    return (await this.contents.findAll(spaceId, query)).map(toContent);
  }

  count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    return this.contents.count(spaceId, kind);
  }

  async get(spaceId: string, id: string): Promise<Content> {
    return toContent(found(await this.contents.findById(spaceId, id)));
  }

  /** The parent must be an existing folder ('' is the root), and the full slug must be free. */
  async create(
    spaceId: string,
    input: { kind: 'FOLDER' | 'DOCUMENT'; parentSlug: string; name: string; slug: string; schema?: string; data?: Record<string, unknown> },
    user: UserRow,
  ): Promise<Content> {
    return toContent(await this.contents.create(spaceId, { ...input, updatedBy: updatedByOf(user) }));
  }

  /** A copy next to the original with a random suffix, never published. */
  async clone(spaceId: string, id: string, user: UserRow): Promise<Content> {
    const source = found(await this.contents.findById(spaceId, id));
    if (source.kind !== 'DOCUMENT') throw new BadRequestException('Only documents can be cloned');
    const suffix = randomSuffix();
    return this.create(
      spaceId,
      {
        kind: 'DOCUMENT',
        parentSlug: source.parentSlug,
        name: `${source.name} ${suffix}`,
        slug: `${source.slug}-${suffix}`,
        schema: source.schema ?? undefined,
        data: source.data ?? undefined,
      },
      user,
    );
  }

  /** Rename and/or move. A folder's new full slug is rewritten into every descendant. */
  async update(spaceId: string, id: string, input: { name?: string; slug?: string; parentSlug?: string }, user: UserRow): Promise<Content> {
    const { content, moved } = found(await this.contents.update(spaceId, id, { ...input, updatedBy: updatedByOf(user) }));
    // As before: a document edit that keeps its slug is a `content.changed`; a move is not.
    if (!moved && content.kind === 'DOCUMENT') this.changed(spaceId, content);
    return toContent(content);
  }

  /** Saves the editor's data and the ids it references (assets, links, references). */
  async updateData(
    spaceId: string,
    id: string,
    input: { data: Record<string, unknown>; assets: string[]; links: string[]; references: string[] },
    user: UserRow,
  ): Promise<Content> {
    const content = found(await this.contents.updateData(spaceId, id, { ...input, updatedBy: updatedByOf(user) }));
    this.changed(spaceId, content);
    return toContent(content);
  }

  /** Deletes the item and, for a folder, everything under it. Published snapshots cascade. */
  async delete(spaceId: string, id: string): Promise<void> {
    const deleted = found(await this.contents.delete(spaceId, id));
    // The delete trigger fired `content.changed` once per deleted item.
    for (const it of deleted) this.changed(spaceId, it);
  }

  /**
   * Publish a document (one snapshot per space locale), or every document under a folder that changed
   * since it was last published. `updatedAt` is left alone so "changed since publish" keeps working.
   */
  async publish(spaceId: string, id: string): Promise<void> {
    const target = found(await this.contents.publish(spaceId, id));
    this.webhooks.dispatch(spaceId, WebHookEvent.CONTENT_PUBLISHED, { id, fullSlug: target.fullSlug });
  }

  /** Stops serving a document (or every published document under a folder). */
  async unpublish(spaceId: string, id: string): Promise<void> {
    const target = found(await this.contents.unpublish(spaceId, id));
    this.webhooks.dispatch(spaceId, WebHookEvent.CONTENT_UNPUBLISHED, { id, fullSlug: target.fullSlug });
  }

  private changed(spaceId: string, content: Pick<ContentEntity, 'id' | 'fullSlug'>): void {
    this.webhooks.dispatch(spaceId, WebHookEvent.CONTENT_CHANGED, { id: content.id, fullSlug: content.fullSlug });
  }
}
