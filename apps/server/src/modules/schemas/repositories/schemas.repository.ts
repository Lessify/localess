import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { isSchemaInUse, type SchemaType, type SchemaUsage } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { contents, schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventsService } from '../../../infra/events/events.service.js';
import { bumpContentVersion } from '../../../shared/data-rules/content-version.js';
import { applySchemaPushPlan } from '../../../shared/queries/schema.query.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import { fieldRefersTo, type SchemaPushPlan } from '../../../shared/utils/schema.utils.js';

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

  /** What uses schema `name` (see `usageOf`). */
  usage(spaceId: string, name: string): Promise<SchemaUsage> {
    return this.usageOf(this.db, spaceId, name);
  }

  /** How many contents each of `names` is the document schema of; names no content uses are left out. */
  async countContentsBySchema(spaceId: string, names: string[], tx?: Transaction): Promise<Map<string, number>> {
    if (!names.length) return new Map();
    const rows = await (tx ?? this.db)
      .select({ schema: contents.schema, value: count() })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.schema, names)))
      .groupBy(contents.schema);
    return new Map(rows.map(it => [it.schema!, Number(it.value)]));
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

  /**
   * `undefined` when the space has no schema `id`; `inUse` (nothing written) while anything uses its current name. The
   * row is locked first, so no content can take the old name between the check and the write.
   */
  rename(spaceId: string, id: string, name: string, tx?: Transaction): Promise<{ schema?: SchemaEntity; inUse?: SchemaUsage } | undefined> {
    return this.write<{ schema?: SchemaEntity; inUse?: SchemaUsage } | undefined>(spaceId, tx, async t => {
      const guard = await this.unused(t, spaceId, id);
      if (!guard || guard.inUse) return { result: guard, changed: [] };
      const [row] = await t.update(schemas).set({ name }).where(this.byId(spaceId, id)).returning();
      return { result: { schema: row }, changed: [{ id, op: 'updated' }] };
    });
  }

  /** `undefined` when the space has no schema `id`; `inUse` (nothing deleted) while anything uses it. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<{ inUse?: SchemaUsage } | undefined> {
    return this.write(spaceId, tx, async t => {
      const guard = await this.unused(t, spaceId, id);
      if (!guard || guard.inUse) return { result: guard, changed: [] };
      await t.delete(schemas).where(this.byId(spaceId, id));
      return { result: {}, changed: [{ id, op: 'deleted' }] };
    });
  }

  /**
   * Writes a push plan (CLI schema push) and bumps the content version: schemas shape the draft output (locale
   * extraction), so content drafts change too. No change events, as before. The schemas it deletes are locked and
   * checked again: when contents use some of them (taken meanwhile), nothing is written and their counts are answered.
   */
  applyPushPlan(spaceId: string, plan: SchemaPushPlan, tx?: Transaction): Promise<Map<string, number>> {
    return transaction(this.db, tx, async t => {
      if (plan.deletes.length) {
        await t
          .select({ id: schemas.id })
          .from(schemas)
          .where(and(eq(schemas.spaceId, spaceId), inArray(schemas.name, plan.deletes)))
          .for('update');
        const used = await this.countContentsBySchema(spaceId, plan.deletes, t);
        if (used.size) return used;
      }
      await applySchemaPushPlan(t, spaceId, plan);
      await bumpContentVersion(t, spaceId);
      return new Map();
    });
  }

  /** Locks schema `id`; `undefined` when there is none, `inUse` when anything uses it, else `{}`. */
  private async unused(t: Transaction, spaceId: string, id: string): Promise<{ inUse?: SchemaUsage } | undefined> {
    const [current] = await t.select({ name: schemas.name }).from(schemas).where(this.byId(spaceId, id)).for('update');
    if (!current) return undefined;
    const usage = await this.usageOf(t, spaceId, current.name);
    return isSchemaInUse(usage) ? { inUse: usage } : {};
  }

  /**
   * The fields of the other schemas that refer to `name` (a schema referring to itself goes with it), and the
   * contents whose document schema it is: how many, and the first five by full slug (byte order).
   */
  private async usageOf(executor: Pick<Database, 'select'>, spaceId: string, name: string): Promise<SchemaUsage> {
    const referring = await executor
      .select({ name: schemas.name, fields: schemas.fields })
      .from(schemas)
      .where(
        and(
          eq(schemas.spaceId, spaceId),
          ne(schemas.name, name),
          sql`jsonb_path_exists(${schemas.fields}, 'lax $[*] ? (@.schemas[*] == $name || @.source == $name)', jsonb_build_object('name', ${name}::text))`,
        ),
      )
      .orderBy(sql`${schemas.name} collate "C"`);
    const byContents = and(eq(contents.spaceId, spaceId), eq(contents.schema, name));
    const [{ value }] = await executor.select({ value: count() }).from(contents).where(byContents);
    const first = Number(value)
      ? await executor
          .select({ name: contents.name, fullSlug: contents.fullSlug })
          .from(contents)
          .where(byContents)
          .orderBy(sql`${contents.fullSlug} collate "C"`)
          .limit(5)
      : [];
    return {
      fields: referring.flatMap(row => (row.fields ?? []).filter(field => fieldRefersTo(field, name)).map(field => ({ schema: row.name, field: field.name }))),
      contents: { count: Number(value), first },
    };
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
