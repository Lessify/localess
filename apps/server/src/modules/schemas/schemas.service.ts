import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
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

/** Schemas of a space. Every write bumps the content version: drafts are rendered through schemas. */
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
      .orderBy(asc(schemas.id));
  }

  async get(spaceId: string, id: string): Promise<SchemaRow> {
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
      if (isUniqueViolation(error)) throw new ConflictException('A schema with this id already exists');
      throw error;
    }
  }

  create(spaceId: string, input: { id: string } & SchemaColumns): Promise<SchemaRow> {
    return this.write(
      spaceId,
      async tx =>
        (
          await tx
            .insert(schemas)
            .values({ spaceId, ...input })
            .returning()
        )[0],
      [{ id: input.id, op: 'created' }],
    );
  }

  /** Several schemas at once, all or nothing (was the space-template `writeBatch`). */
  createMany(spaceId: string, inputs: ({ id: string } & SchemaColumns)[]): Promise<SchemaRow[]> {
    if (!inputs.length) return Promise.resolve([]);
    return this.write(
      spaceId,
      tx =>
        tx
          .insert(schemas)
          .values(inputs.map(input => ({ spaceId, ...input })))
          .returning(),
      inputs.map(it => ({ id: it.id, op: 'created' as const })),
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

  /** Renames in one statement (the UI used to copy the document and delete the old one, non-atomically). */
  rename(spaceId: string, id: string, newId: string): Promise<SchemaRow> {
    return this.write(
      spaceId,
      async tx => {
        const [row] = await tx
          .update(schemas)
          .set({ id: newId, updatedAt: new Date() })
          .where(and(eq(schemas.spaceId, spaceId), eq(schemas.id, id)))
          .returning();
        if (!row) throw new NotFoundException('Schema not found');
        return row;
      },
      [
        { id, op: 'deleted' },
        { id: newId, op: 'created' },
      ],
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
