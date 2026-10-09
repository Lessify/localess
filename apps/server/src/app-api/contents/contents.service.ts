import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, ne, notInArray, or, sql, SQL } from 'drizzle-orm';
import { Schema, WebHookEvent } from '@localess/shared';
import { DATABASE, Database } from '../../database/database.module.js';
import { newId } from '../../database/id.js';
import { contentPublished, contents, schemas, UpdatedBy } from '../../database/schema.js';
import { buildDocumentStorage } from '../../domain/lib/content-extract.js';
import { EventsService } from '../../events/events.service.js';
import type { UserRow } from '../../users/users.service.js';
import { WebhookDispatcher } from '../../webhooks/webhook-dispatcher.service.js';
import { bumpVersion, requireSpace } from '../common/space-access.js';

export type ContentRow = typeof contents.$inferSelect;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface ContentQuery {
  parentSlug?: string;
  kind?: 'FOLDER' | 'DOCUMENT';
  /** Case-insensitive name prefix. */
  name?: string;
  ids?: string[];
  limit?: number;
}

interface WriteResult<T> {
  result: T;
  changed: { id: string; op: 'created' | 'updated' | 'deleted' }[];
  webhooks?: { event: WebHookEvent; id: string; fullSlug: string }[];
}

/** LIKE pattern for "starts with", metacharacters escaped. */
const startsWith = (prefix: string) => `${prefix.replace(/[\\%_]/g, m => `\\${m}`)}%`;
const joinSlug = (parentSlug: string, slug: string) => (parentSlug ? `${parentSlug}/${slug}` : slug);
const randomSuffix = () => Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)]).join('');

export function updatedByOf(user: UserRow): UpdatedBy {
  return { name: user.displayName || user.email, email: user.email };
}

/**
 * Content tree of a space. Replaces the SPA's direct Firestore writes and what the content triggers
 * did behind them: every write bumps the content version (was `cache.json`), folder renames cascade
 * to descendants in one statement, deletes take the subtree, and webhooks fire as before.
 */
@Injectable()
export class ContentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
    private readonly webhooks: WebhookDispatcher,
  ) {}

  async list(spaceId: string, query: ContentQuery): Promise<ContentRow[]> {
    const conditions: SQL[] = [eq(contents.spaceId, spaceId)];
    if (query.parentSlug !== undefined) conditions.push(eq(contents.parentSlug, query.parentSlug));
    if (query.kind) conditions.push(eq(contents.kind, query.kind));
    if (query.name) conditions.push(ilike(contents.name, startsWith(query.name)));
    if (query.ids) conditions.push(query.ids.length ? inArray(contents.id, query.ids) : sql`false`);
    const select = this.db
      .select()
      .from(contents)
      .where(and(...conditions))
      .orderBy(desc(contents.kind), asc(contents.name));
    return query.limit ? select.limit(query.limit) : select;
  }

  async count(spaceId: string, kind?: 'FOLDER' | 'DOCUMENT'): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(contents)
      .where(kind ? and(eq(contents.spaceId, spaceId), eq(contents.kind, kind)) : eq(contents.spaceId, spaceId));
    return Number(value);
  }

  async get(spaceId: string, id: string, executor: Pick<Database, 'select'> = this.db): Promise<ContentRow> {
    const [row] = await executor
      .select()
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.id, id)));
    if (!row) throw new NotFoundException('Content not found');
    return row;
  }

  /**
   * Runs `work` in a transaction that also bumps the content version and queues change events.
   * Webhooks go out only after the commit, so receivers never see (or fetch) uncommitted state.
   */
  private async write<T>(spaceId: string, work: (tx: Transaction) => Promise<WriteResult<T>>): Promise<T> {
    const { result, webhooks } = await this.db.transaction(async tx => {
      await requireSpace(tx, spaceId);
      const outcome = await work(tx);
      await bumpVersion(tx, spaceId, 'content');
      for (const it of outcome.changed) await this.events.publish({ spaceId, entity: 'contents', ...it }, tx);
      return outcome;
    });
    for (const hook of webhooks ?? []) this.webhooks.dispatch(spaceId, hook.event, { id: hook.id, fullSlug: hook.fullSlug });
    return result;
  }

  /** The parent must be an existing folder ('' is the root), and the full slug must be free. */
  private async checkPlacement(tx: Transaction, spaceId: string, parentSlug: string, fullSlug: string, selfId?: string): Promise<void> {
    if (parentSlug) {
      const [parent] = await tx
        .select({ kind: contents.kind })
        .from(contents)
        .where(and(eq(contents.spaceId, spaceId), eq(contents.fullSlug, parentSlug)));
      if (parent?.kind !== 'FOLDER') throw new BadRequestException(`No folder at '${parentSlug}'`);
    }
    const [taken] = await tx
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), eq(contents.fullSlug, fullSlug), ...(selfId ? [ne(contents.id, selfId)] : [])));
    if (taken) throw new ConflictException(`'${fullSlug}' is already used`);
  }

  create(
    spaceId: string,
    input: { kind: 'FOLDER' | 'DOCUMENT'; parentSlug: string; name: string; slug: string; schema?: string; data?: Record<string, unknown> },
    user: UserRow,
  ): Promise<ContentRow> {
    return this.write(spaceId, async tx => {
      const fullSlug = joinSlug(input.parentSlug, input.slug);
      await this.checkPlacement(tx, spaceId, input.parentSlug, fullSlug);
      const [row] = await tx
        .insert(contents)
        .values({
          id: newId(),
          spaceId,
          kind: input.kind,
          name: input.name,
          slug: input.slug,
          parentSlug: input.parentSlug,
          fullSlug,
          schema: input.kind === 'DOCUMENT' ? input.schema : null,
          data: input.kind === 'DOCUMENT' ? (input.data ?? null) : null,
          updatedBy: updatedByOf(user),
        })
        .returning();
      return { result: row, changed: [{ id: row.id, op: 'created' }] };
    });
  }

  /** A copy next to the original with a random suffix, never published. */
  async clone(spaceId: string, id: string, user: UserRow): Promise<ContentRow> {
    const source = await this.get(spaceId, id);
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

  /**
   * Rename and/or move. A folder's new full slug is rewritten into every descendant in the same
   * transaction (the `content-onupdate` trigger used to cascade it level by level).
   */
  update(spaceId: string, id: string, input: { name?: string; slug?: string; parentSlug?: string }, user: UserRow): Promise<ContentRow> {
    return this.write(spaceId, async tx => {
      const current = await this.get(spaceId, id, tx);
      const slug = input.slug ?? current.slug;
      const parentSlug = input.parentSlug ?? current.parentSlug;
      const fullSlug = joinSlug(parentSlug, slug);
      const moved = fullSlug !== current.fullSlug;
      if (moved) {
        if (current.kind === 'FOLDER' && (parentSlug === current.fullSlug || parentSlug.startsWith(`${current.fullSlug}/`))) {
          throw new BadRequestException('A folder cannot be moved into itself');
        }
        await this.checkPlacement(tx, spaceId, parentSlug, fullSlug, id);
      }
      const [row] = await tx
        .update(contents)
        .set({ name: input.name ?? current.name, slug, parentSlug, fullSlug, updatedBy: updatedByOf(user), updatedAt: new Date() })
        .where(and(eq(contents.spaceId, spaceId), eq(contents.id, id)))
        .returning();
      const changed: { id: string; op: 'updated' }[] = [{ id, op: 'updated' }];
      if (moved && current.kind === 'FOLDER') {
        const old = current.fullSlug;
        const descendants = await tx
          .update(contents)
          .set({
            fullSlug: sql`${fullSlug} || substr(${contents.fullSlug}, ${old.length + 1})`,
            parentSlug: sql`${fullSlug} || substr(${contents.parentSlug}, ${old.length + 1})`,
            updatedAt: new Date(),
          })
          .where(
            and(eq(contents.spaceId, spaceId), or(eq(contents.parentSlug, old), sql`${contents.parentSlug} like ${startsWith(`${old}/`)}`)),
          )
          .returning({ id: contents.id });
        changed.push(...descendants.map(it => ({ id: it.id, op: 'updated' as const })));
      }
      // As before: a document edit that keeps its slug is a `content.changed`; a move is not.
      const webhooks = !moved && row.kind === 'DOCUMENT' ? [{ event: WebHookEvent.CONTENT_CHANGED, id, fullSlug: row.fullSlug }] : [];
      return { result: row, changed, webhooks };
    });
  }

  /** Saves the editor's data and the ids it references (assets, links, references). */
  updateData(
    spaceId: string,
    id: string,
    input: { data: Record<string, unknown>; assets: string[]; links: string[]; references: string[] },
    user: UserRow,
  ): Promise<ContentRow> {
    return this.write(spaceId, async tx => {
      const current = await this.get(spaceId, id, tx);
      if (current.kind !== 'DOCUMENT') throw new BadRequestException('Only documents have data');
      const [row] = await tx
        .update(contents)
        .set({ ...input, updatedBy: updatedByOf(user), updatedAt: new Date() })
        .where(and(eq(contents.spaceId, spaceId), eq(contents.id, id)))
        .returning();
      return {
        result: row,
        changed: [{ id, op: 'updated' }],
        webhooks: [{ event: WebHookEvent.CONTENT_CHANGED, id, fullSlug: row.fullSlug }],
      };
    });
  }

  /** Deletes the item and, for a folder, everything under it. Published snapshots cascade. */
  delete(spaceId: string, id: string): Promise<void> {
    return this.write(spaceId, async tx => {
      const current = await this.get(spaceId, id, tx);
      const subtree =
        current.kind === 'FOLDER'
          ? or(
              eq(contents.id, id),
              eq(contents.parentSlug, current.fullSlug),
              sql`${contents.parentSlug} like ${startsWith(`${current.fullSlug}/`)}`,
            )
          : eq(contents.id, id);
      const deleted = await tx
        .delete(contents)
        .where(and(eq(contents.spaceId, spaceId), subtree))
        .returning({ id: contents.id, fullSlug: contents.fullSlug });
      return {
        result: undefined,
        changed: deleted.map(it => ({ id: it.id, op: 'deleted' as const })),
        // The delete trigger fired `content.changed` once per deleted item.
        webhooks: deleted.map(it => ({ event: WebHookEvent.CONTENT_CHANGED, id: it.id, fullSlug: it.fullSlug })),
      };
    });
  }

  /**
   * Publish a document (one snapshot per space locale), or every document under a folder that changed
   * since it was last published. `updatedAt` is left alone so "changed since publish" keeps working.
   */
  publish(spaceId: string, id: string): Promise<void> {
    return this.write(spaceId, async tx => {
      const space = await requireSpace(tx, spaceId);
      const target = await this.get(spaceId, id, tx);
      const documents =
        target.kind === 'DOCUMENT'
          ? [target]
          : (
              await tx
                .select()
                .from(contents)
                .where(
                  and(
                    eq(contents.spaceId, spaceId),
                    eq(contents.kind, 'DOCUMENT'),
                    or(eq(contents.parentSlug, target.fullSlug), sql`${contents.parentSlug} like ${startsWith(`${target.fullSlug}/`)}`),
                  ),
                )
            ).filter(doc => !(doc.publishedAt && doc.publishedAt > doc.updatedAt));
      const schemaRows = await tx.select().from(schemas).where(eq(schemas.spaceId, spaceId));
      const schemaById = new Map(schemaRows.map(row => [row.id, row as unknown as Schema]));
      const publishedAt = new Date();
      const localeIds = space.locales.map(it => it.id);
      for (const document of documents) {
        for (const locale of localeIds) {
          const data = buildDocumentStorage(document, schemaById, locale, publishedAt.toISOString()) as unknown as Record<string, unknown>;
          await tx
            .insert(contentPublished)
            .values({ spaceId, contentId: document.id, locale, data, publishedAt })
            .onConflictDoUpdate({
              target: [contentPublished.spaceId, contentPublished.contentId, contentPublished.locale],
              set: { data, publishedAt },
            });
        }
        // Locales removed from the space since the last publish must stop being served.
        await tx
          .delete(contentPublished)
          .where(
            and(
              eq(contentPublished.spaceId, spaceId),
              eq(contentPublished.contentId, document.id),
              notInArray(contentPublished.locale, localeIds),
            ),
          );
        await tx
          .update(contents)
          .set({ publishedAt })
          .where(and(eq(contents.spaceId, spaceId), eq(contents.id, document.id)));
      }
      return {
        result: undefined,
        changed: documents.map(it => ({ id: it.id, op: 'updated' as const })),
        webhooks: [{ event: WebHookEvent.CONTENT_PUBLISHED, id, fullSlug: target.fullSlug }],
      };
    });
  }

  /** Stops serving a document (or every published document under a folder). */
  unpublish(spaceId: string, id: string): Promise<void> {
    return this.write(spaceId, async tx => {
      const target = await this.get(spaceId, id, tx);
      const scope =
        target.kind === 'DOCUMENT'
          ? eq(contents.id, id)
          : and(
              eq(contents.kind, 'DOCUMENT'),
              or(eq(contents.parentSlug, target.fullSlug), sql`${contents.parentSlug} like ${startsWith(`${target.fullSlug}/`)}`),
            );
      const unpublished = await tx
        .update(contents)
        .set({ publishedAt: null })
        .where(and(eq(contents.spaceId, spaceId), isNotNull(contents.publishedAt), scope))
        .returning({ id: contents.id });
      if (unpublished.length) {
        await tx.delete(contentPublished).where(
          and(
            eq(contentPublished.spaceId, spaceId),
            inArray(
              contentPublished.contentId,
              unpublished.map(it => it.id),
            ),
          ),
        );
      }
      return {
        result: undefined,
        changed: unpublished.map(it => ({ id: it.id, op: 'updated' as const })),
        webhooks: [{ event: WebHookEvent.CONTENT_UNPUBLISHED, id, fullSlug: target.fullSlug }],
      };
    });
  }
}
