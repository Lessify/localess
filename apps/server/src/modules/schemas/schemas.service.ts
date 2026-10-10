import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../infra/database/id.js';
import { schemas } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { bumpVersion, requireSpace } from '../../infra/http/space-access.js';

export type SchemaRow = typeof schemas.$inferSelect;
type SchemaColumns = Pick<
  typeof schemas.$inferInsert,
  'type' | 'displayName' | 'description' | 'labels' | 'previewField' | 'fields' | 'values'
>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const isUniqueViolation = (error: unknown) =>
  (error as { cause?: { code?: string }; code?: string })?.cause?.code === '23505' || (error as { code?: string })?.code === '23505';

/**
 * Schemas of a space. Routes use the UUID `id`; `name` is what content and fields refer to, unique per space.
 * Every write bumps the content version: drafts are rendered through schemas.
 */
@Injectable()
export class SchemasService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  async list(spaceId: string, type?: string): Promise<SchemaRow[]> {
    return this.db
      .select()
      .from(schemas)
      .where(type ? and(eq(schemas.spaceId, spaceId), eq(schemas.type, type)) : eq(schemas.spaceId, spaceId))
      .orderBy(asc(schemas.name));
  }

  async get(spaceId: string, id: string): Promise<SchemaRow> {
    if (!isUuid(id)) throw new NotFoundException('Schema not found');
    const [row] = await this.db
      .select()
      .from(schemas)
      .where(and(eq(schemas.spaceId, spaceId), eq(schemas.id, id)));
    if (!row) throw new NotFoundException('Schema not found');
    return row;
  }

  private async write<T>(
    spaceId: string,
    work: (tx: Transaction) => Promise<T>,
    event: { id: string; op: 'created' | 'updated' | 'deleted' }[],
  ): Promise<T> {
    try {
      return await this.db.transaction(async tx => {
        await requireSpace(tx, spaceId);
        const result = await work(tx);
        await bumpVersion(tx, spaceId, 'content');
        for (const it of event) await this.events.publish({ spaceId, entity: 'schemas', ...it }, tx);
        return result;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('A schema with this name already exists');
      throw error;
    }
  }

  create(spaceId: string, input: { name: string } & SchemaColumns): Promise<SchemaRow> {
    const id = newUuid();
    return this.write(
      spaceId,
      async tx =>
        (
          await tx
            .insert(schemas)
            .values({ id, spaceId, ...input })
            .returning()
        )[0],
      [{ id, op: 'created' }],
    );
  }

  /** Several schemas at once, all or nothing (was the space-template `writeBatch`). */
  createMany(spaceId: string, inputs: ({ name: string } & SchemaColumns)[]): Promise<SchemaRow[]> {
    if (!inputs.length) return Promise.resolve([]);
    const rows = inputs.map(input => ({ id: newUuid(), spaceId, ...input }));
    return this.write(
      spaceId,
      tx => tx.insert(schemas).values(rows).returning(),
      rows.map(it => ({ id: it.id, op: 'created' as const })),
    );
  }

  /** Replaces the editable fields; absent ones are cleared (the UI's `deleteField()`). */
  update(spaceId: string, id: string, input: Omit<SchemaColumns, 'type'>): Promise<SchemaRow> {
    return this.write(
      spaceId,
      async tx => {
        const [row] = await tx
          .update(schemas)
          .set({
            displayName: input.displayName || null,
            description: input.description || null,
            labels: input.labels?.length ? input.labels : null,
            previewField: input.previewField || null,
            fields: input.fields ?? null,
            values: input.values ?? null,
            updatedAt: new Date(),
          })
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.id, id)))
          .returning();
        if (!row) throw new NotFoundException('Schema not found');
        return row;
      },
      [{ id, op: 'updated' }],
    );
  }

  /**
   * Changes the name; the id stays. Content and fields referring to the old name are not rewritten (as before):
   * they keep the old name until edited.
   */
  rename(spaceId: string, id: string, name: string): Promise<SchemaRow> {
    return this.write(
      spaceId,
      async tx => {
        const [row] = await tx
          .update(schemas)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.id, id)))
          .returning();
        if (!row) throw new NotFoundException('Schema not found');
        return row;
      },
      [{ id, op: 'updated' }],
    );
  }

  delete(spaceId: string, id: string): Promise<void> {
    return this.write(
      spaceId,
      async tx => {
        const deleted = await tx
          .delete(schemas)
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.id, id)))
          .returning({ id: schemas.id });
        if (!deleted.length) throw new NotFoundException('Schema not found');
      },
      [{ id, op: 'deleted' }],
    );
  }
}
