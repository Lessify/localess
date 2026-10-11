import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { SchemaType } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { bumpContentVersion } from '../../../shared/data-rules/content-version.js';
import { applySchemaPushPlan } from '../../../shared/queries/schema.query.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import type { SchemaPushPlan } from '../../../shared/utils/schema.utils.js';

export type SchemaEntity = typeof schemas.$inferSelect;
export type SchemaColumns = Pick<
  typeof schemas.$inferInsert,
  'type' | 'displayName' | 'description' | 'labels' | 'previewField' | 'fields' | 'values'
>;
export type NewSchema = { name: string } & SchemaColumns;

type Change = { id: string; op: 'created' | 'updated' | 'deleted' };

/**
 * The `schemas` rows of a space. Every app write, in one transaction: the space checked (404 when gone), the change,
 * the content version bumped (drafts are rendered through schemas) and a `schemas` change event per changed row. A
 * name already taken in the space is a `ConflictException`.
 */
@Injectable()
export class SchemasRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  /** For the app: by name, in the database collation. */
  findAll(spaceId: string, type?: SchemaType): Promise<SchemaEntity[]> {
    return this.db
      .select()
      .from(schemas)
      .where(type ? and(eq(schemas.spaceId, spaceId), eq(schemas.type, type)) : eq(schemas.spaceId, spaceId))
      .orderBy(asc(schemas.name));
  }

  /** For the public API, the OpenAPI document and the push: by name in byte order, as Firestore returned documents. */
  findAllInByteOrder(spaceId: string): Promise<SchemaEntity[]> {
    return this.db
      .select()
      .from(schemas)
      .where(eq(schemas.spaceId, spaceId))
      .orderBy(sql`${schemas.name} collate "C"`);
  }

  async findById(spaceId: string, id: string): Promise<SchemaEntity | undefined> {
    if (!isUuid(id)) return undefined;
    const [row] = await this.db.select().from(schemas).where(this.byId(spaceId, id));
    return row;
  }

  create(spaceId: string, values: NewSchema, tx?: Transaction): Promise<SchemaEntity> {
    const id = newUuid();
    return this.write(spaceId, tx, async t => {
      const [row] = await t
        .insert(schemas)
        .values({ id, spaceId, ...values })
        .returning();
      return { result: row, changed: [{ id, op: 'created' }] };
    });
  }

  /** Several schemas at once, all or nothing (was the space-template `writeBatch`). */
  createMany(spaceId: string, values: NewSchema[], tx?: Transaction): Promise<SchemaEntity[]> {
    if (!values.length) return Promise.resolve([]);
    const rows = values.map(it => ({ id: newUuid(), spaceId, ...it }));
    return this.write(spaceId, tx, async t => {
      const result = await t.insert(schemas).values(rows).returning();
      return { result, changed: rows.map(it => ({ id: it.id, op: 'created' as const })) };
    });
  }

  /** `undefined` when the space has no schema `id`. */
  update(spaceId: string, id: string, values: Omit<SchemaColumns, 'type'>, tx?: Transaction): Promise<SchemaEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const [row] = await t.update(schemas).set(values).where(this.byId(spaceId, id)).returning();
      return { result: row, changed: row ? [{ id, op: 'updated' }] : [] };
    });
  }

  /** `undefined` when the space has no schema `id`. */
  rename(spaceId: string, id: string, name: string, tx?: Transaction): Promise<SchemaEntity | undefined> {
    return this.write(spaceId, tx, async t => {
      const [row] = await t.update(schemas).set({ name }).where(this.byId(spaceId, id)).returning();
      return { result: row, changed: row ? [{ id, op: 'updated' }] : [] };
    });
  }

  /** Whether the space had schema `id`. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<boolean> {
    return this.write(spaceId, tx, async t => {
      const deleted = await t.delete(schemas).where(this.byId(spaceId, id)).returning({ id: schemas.id });
      return { result: deleted.length > 0, changed: deleted.length ? [{ id, op: 'deleted' }] : [] };
    });
  }

  /**
   * Writes a push plan (CLI schema push) and bumps the content version: schemas shape the draft output (locale
   * extraction), so content drafts change too. No change events, as before.
   */
  applyPushPlan(spaceId: string, plan: SchemaPushPlan, tx?: Transaction): Promise<void> {
    return transaction(this.db, tx, async t => {
      await applySchemaPushPlan(t, spaceId, plan);
      await bumpContentVersion(t, spaceId);
    });
  }

  private async write<T>(
    spaceId: string,
    tx: Transaction | undefined,
    work: (tx: Transaction) => Promise<{ result: T; changed: Change[] }>,
  ): Promise<T> {
    try {
      return await transaction(this.db, tx, async t => {
        await requireSpace(t, spaceId);
        const { result, changed } = await work(t);
        if (changed.length) {
          await bumpContentVersion(t, spaceId);
          for (const it of changed) await this.events.publish({ spaceId, entity: 'schemas', ...it }, t);
        }
        return result;
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('A schema with this name already exists');
      throw error;
    }
  }

  private byId(spaceId: string, id: string) {
    return and(eq(schemas.spaceId, spaceId), eq(schemas.id, id));
  }
}
