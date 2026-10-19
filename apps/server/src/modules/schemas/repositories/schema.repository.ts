import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { isSchemaInUse, type SchemaField, SchemaFieldKind, type SchemaType, type SchemaUsage } from '@localess/shared';
import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { isUuid, newUuid } from '../../../infra/database/id.js';
import { contents, schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, transaction, type Transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import { applySchemaPushPlan, lockSchemaReferences } from '../../../shared/queries/schema.query.js';
import { folderPaths, withPaths } from '../../../shared/queries/content-tree.query.js';
import { requireSpace } from '../../../shared/queries/space.query.js';
import { fieldRefersTo, type SchemaPushPlan } from '../../../shared/utils/schema.utils.js';
import type { SchemaInsertEntity, SchemaEntity } from '../../../shared/entities/schema.entity.js';

export type SchemaColumns = Pick<
  SchemaInsertEntity,
  'type' | 'displayName' | 'description' | 'labels' | 'previewField' | 'fields' | 'values'
>;
export type NewSchema = { name: string } & SchemaColumns;

type Change = { id: string; op: 'created' | 'updated' | 'deleted' };

/**
 * The `schemas` rows of a space. Every app write, in one transaction: the space checked (404 when gone), the change
 * and a `schemas` change event per changed row (content snapshots stay: a draft is rebuilt when its document changes). A
 * name already taken in the space is a `ConflictException`.
 */
/** `fields` with every block reference to `from` (the schema itself) renamed to `to`. */
function renameSelfReferences(fields: SchemaField[], from: string, to: string): SchemaField[] {
  return fields.map(field =>
    (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) && field.schemas?.includes(from)
      ? { ...field, schemas: field.schemas.map(it => (it === from ? to : it)) }
      : field,
  );
}

@Injectable()
export class SchemaRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
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

  /**
   * `undefined` when the space has no schema `id`. `lost`: schemas its fields refer to that are gone since the caller
   * checked (nothing written); the ones still there stay locked until the commit, so they can not go meanwhile.
   */
  update(
    spaceId: string,
    id: string,
    values: Omit<SchemaColumns, 'type'>,
    tx?: Transaction,
  ): Promise<{ schema?: SchemaEntity; lost?: string[] } | undefined> {
    return this.write<{ schema?: SchemaEntity; lost?: string[] } | undefined>(spaceId, tx, async t => {
      const [current] = await t.select({ name: schemas.name }).from(schemas).where(this.byId(spaceId, id)).for('update');
      if (!current) return { result: undefined, changed: [] };
      const lost = await lockSchemaReferences(t, spaceId, [{ name: current.name, fields: values.fields }]);
      if (lost.length) return { result: { lost }, changed: [] };
      const [row] = await t.update(schemas).set(values).where(this.byId(spaceId, id)).returning();
      return { result: { schema: row }, changed: [{ id, op: 'updated' }] };
    });
  }

  /**
   * `undefined` when the space has no schema `id`; `inUse` (nothing written) while anything uses its current name. The
   * row is locked first, so no content can take the old name between the check and the write. Its own fields that
   * allow it (a NODE nesting itself) follow the new name.
   */
  rename(spaceId: string, id: string, name: string, tx?: Transaction): Promise<{ schema?: SchemaEntity; inUse?: SchemaUsage } | undefined> {
    return this.write<{ schema?: SchemaEntity; inUse?: SchemaUsage } | undefined>(spaceId, tx, async t => {
      const guard = await this.unused(t, spaceId, id);
      if (!guard || guard.inUse) return { result: guard, changed: [] };
      const [current] = await t.select({ name: schemas.name, fields: schemas.fields }).from(schemas).where(this.byId(spaceId, id));
      const [row] = await t
        .update(schemas)
        .set({ name, fields: current.fields && renameSelfReferences(current.fields, current.name, name) })
        .where(this.byId(spaceId, id))
        .returning();
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
   * Writes a push plan (CLI schema push). No change events, as before. Checked again under lock, writing nothing
   * when it fails: `usedByContents`, the schemas it deletes that contents use (taken meanwhile), with their counts;
   * `lost`, the schemas its fields refer to that are gone since it was planned.
   */
  applyPushPlan(spaceId: string, plan: SchemaPushPlan, tx?: Transaction): Promise<{ usedByContents: Map<string, number>; lost: string[] }> {
    return transaction(this.db, tx, async t => {
      const written = [...plan.creates, ...plan.updates].map(it => ({ name: it.id, fields: 'fields' in it ? it.fields : undefined }));
      const lost = await lockSchemaReferences(t, spaceId, written);
      let usedByContents = new Map<string, number>();
      if (plan.deletes.length) {
        await t
          .select({ id: schemas.id })
          .from(schemas)
          .where(and(eq(schemas.spaceId, spaceId), inArray(schemas.name, plan.deletes)))
          .for('update');
        usedByContents = await this.countContentsBySchema(spaceId, plan.deletes, t);
      }
      if (lost.length || usedByContents.size) return { usedByContents, lost };
      await applySchemaPushPlan(t, spaceId, plan);
      return { usedByContents, lost };
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
    // Paths are computed (content-tree.query.ts): the first five by path in byte order, as `collate "C"` sorted them.
    const first = Number(value)
      ? withPaths(
          await executor.select({ name: contents.name, parentId: contents.parentId, slug: contents.slug }).from(contents).where(byContents),
          await folderPaths(executor, spaceId),
        )
          .sort((a, b) => (a.fullSlug < b.fullSlug ? -1 : a.fullSlug > b.fullSlug ? 1 : 0))
          .slice(0, 5)
          .map(it => ({ name: it.name, fullSlug: it.fullSlug }))
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
        for (const it of changed) await this.eventService.publish({ spaceId, entity: 'schemas', ...it }, t);
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
