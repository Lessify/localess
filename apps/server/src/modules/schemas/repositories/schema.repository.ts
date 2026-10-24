import { isSchemaInUse, type SchemaField, SchemaFieldKind, type SchemaType, type SchemaUsage } from '@localess/shared';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';

import { DATABASE, type Database } from '../../../infra/database/database.module.js';
import { newUuid } from '../../../infra/database/id.js';
import { contents, schemas } from '../../../infra/database/schema.js';
import { isUniqueViolation, type Transaction, transaction } from '../../../infra/database/transaction.js';
import { EventService } from '../../../infra/events/event.service.js';
import type { SchemaEntity, SchemaInsertEntity } from '../../../shared/entities/schema.entity.js';
import { folderPaths, withPaths } from '../../../shared/queries/content-tree.query.js';
import { applySchemaPushPlan, lockSchemaReferences } from '../../../shared/queries/schema.query.js';
import { fieldRefersTo, type SchemaPushPlan } from '../../../shared/utils/schema.utils.js';
import { inUseMessage, lostMessage } from '../utils/schema-conflicts.js';

export type SchemaColumns = Pick<
  SchemaInsertEntity,
  'type' | 'displayName' | 'description' | 'labels' | 'previewField' | 'fields' | 'values'
>;
export type NewSchema = { name: string } & SchemaColumns;

type Change = { id: string; op: 'created' | 'updated' | 'deleted' };

/** `fields` with every block reference to `from` (the schema itself) renamed to `to`. */
function renameSelfReferences(fields: SchemaField[], from: string, to: string): SchemaField[] {
  return fields.map(field =>
    (field.kind === SchemaFieldKind.SCHEMA || field.kind === SchemaFieldKind.SCHEMAS) && field.schemas?.includes(from)
      ? { ...field, schemas: field.schemas.map(it => (it === from ? to : it)) }
      : field,
  );
}

/**
 * The `schemas` rows of a space. Every app write runs in one transaction with a `schemas` change event per row it
 * changed (content snapshots stay: a draft is rebuilt when its document changes); the service has checked the space and
 * the schema. What a write must not break is checked again under the row's lock (409, the service's message): a
 * schema in use is neither renamed nor deleted, the schemas an update refers to must still be there. A name already
 * taken in the space is a `ConflictException`.
 */
@Injectable()
export class SchemaRepository {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly eventService: EventService,
  ) {}

  /** For the app: by name, in the database collation. */
  findAll(spaceId: string, type?: SchemaType): Promise<SchemaEntity[]> {
    return this.db.query.schemas.findMany({
      where: type ? and(eq(schemas.spaceId, spaceId), eq(schemas.type, type)) : eq(schemas.spaceId, spaceId),
      orderBy: [asc(schemas.name)],
    });
  }

  /** For the public API, the OpenAPI document and the push: by name in byte order, as Firestore returned documents. */
  findAllInByteOrder(spaceId: string): Promise<SchemaEntity[]> {
    return this.db.query.schemas.findMany({ where: eq(schemas.spaceId, spaceId), orderBy: [asc(sql`${schemas.name} collate "C"`)] });
  }

  findOne(spaceId: string, id: string): Promise<SchemaEntity | undefined> {
    return this.db.query.schemas.findFirst({ where: this.byId(spaceId, id) });
  }

  /**
   * What uses schema `name`: the fields of the other schemas that refer to it (a schema referring to itself goes with
   * it), and the contents whose document schema it is: how many, and the first five by full slug (byte order).
   */
  async findUsage(spaceId: string, name: string, tx?: Transaction): Promise<SchemaUsage> {
    const executor = tx ?? this.db;
    const referring = await executor.query.schemas.findMany({
      columns: { name: true, fields: true },
      where: and(
        eq(schemas.spaceId, spaceId),
        ne(schemas.name, name),
        sql`jsonb_path_exists(${schemas.fields}, 'lax $[*] ? (@.schemas[*] == $name || @.source == $name)', jsonb_build_object('name', ${name}::text))`,
      ),
      orderBy: [asc(sql`${schemas.name} collate "C"`)],
    });
    const byContents = and(eq(contents.spaceId, spaceId), eq(contents.schema, name));
    const total = await executor.$count(contents, byContents);
    // Paths are computed (content-tree.query.ts): the first five by path in byte order, as `collate "C"` sorted them.
    const first = total
      ? withPaths(
          await executor.query.contents.findMany({ columns: { name: true, parentId: true, slug: true }, where: byContents }),
          await folderPaths(executor, spaceId),
        )
          .sort((a, b) => (a.fullSlug < b.fullSlug ? -1 : a.fullSlug > b.fullSlug ? 1 : 0))
          .slice(0, 5)
          .map(it => ({ name: it.name, fullSlug: it.fullSlug }))
      : [];
    return {
      fields: referring.flatMap(row =>
        (row.fields ?? []).filter(field => fieldRefersTo(field, name)).map(field => ({ schema: row.name, field: field.name })),
      ),
      contents: { count: total, first },
    };
  }

  /** How many contents each of `names` is the document schema of; names no content uses are left out. */
  async countContentsBySchema(spaceId: string, names: string[], tx?: Transaction): Promise<Map<string, number>> {
    if (!names.length) return new Map();
    // A count per schema (`group by`): a calculation, a select.
    const rows = await (tx ?? this.db)
      .select({ schema: contents.schema, value: sql<number>`count(*)::int` })
      .from(contents)
      .where(and(eq(contents.spaceId, spaceId), inArray(contents.schema, names)))
      .groupBy(contents.schema);
    return new Map(rows.map(it => [it.schema!, it.value]));
  }

  /** Answers the new schema's id. */
  async create(spaceId: string, values: NewSchema, tx?: Transaction): Promise<string> {
    const id = newUuid();
    await this.write(spaceId, tx, async t => {
      await t.insert(schemas).values({ id, spaceId, ...values });
      return [{ id, op: 'created' }];
    });
    return id;
  }

  /**
   * The schemas its fields refer to are locked until the commit, so they can not go meanwhile; one already gone since
   * the service checked is a 409 (nothing written). A schema deleted meanwhile: nothing written, no event.
   */
  update(spaceId: string, id: string, values: Omit<SchemaColumns, 'type'>, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const current = await this.lock(t, spaceId, id);
      if (!current) return [];
      const lost = await lockSchemaReferences(t, spaceId, [{ name: current.name, fields: values.fields }]);
      if (lost.length) throw new ConflictException(lostMessage(lost));
      await t.update(schemas).set(values).where(this.byId(spaceId, id));
      return [{ id, op: 'updated' }];
    });
  }

  /**
   * Changes the name; 409 (nothing written) while anything uses the current one. The row is locked first, so no
   * content can take the old name between the check and the write. Its own fields that allow it (a NODE nesting itself)
   * follow the new name.
   */
  rename(spaceId: string, id: string, name: string, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      const current = await this.lockUnused(t, spaceId, id);
      if (!current) return [];
      await t
        .update(schemas)
        .set({ name, fields: current.fields && renameSelfReferences(current.fields, current.name, name) })
        .where(this.byId(spaceId, id));
      return [{ id, op: 'updated' }];
    });
  }

  /** 409 (nothing deleted) while anything uses the schema, checked under its row lock as a rename. */
  delete(spaceId: string, id: string, tx?: Transaction): Promise<void> {
    return this.write(spaceId, tx, async t => {
      if (!(await this.lockUnused(t, spaceId, id))) return [];
      await t.delete(schemas).where(this.byId(spaceId, id));
      return [{ id, op: 'deleted' }];
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

  /** Locks schema `id` (`.for('update')`: the relational API has no lock); `undefined` when it is not there. */
  private async lock(t: Transaction, spaceId: string, id: string): Promise<Pick<SchemaEntity, 'name' | 'fields'> | undefined> {
    const [current] = await t
      .select({ name: schemas.name, fields: schemas.fields })
      .from(schemas)
      .where(this.byId(spaceId, id))
      .for('update');
    return current;
  }

  /** Locks schema `id`; `undefined` when it is not there, 409 when anything uses it. */
  private async lockUnused(t: Transaction, spaceId: string, id: string): Promise<Pick<SchemaEntity, 'name' | 'fields'> | undefined> {
    const current = await this.lock(t, spaceId, id);
    if (!current) return undefined;
    const usage = await this.findUsage(spaceId, current.name, t);
    if (isSchemaInUse(usage)) throw new ConflictException(inUseMessage(current.name, usage));
    return current;
  }

  /** The work in one transaction (the caller's, given one), then an event per row it changed. */
  private async write(spaceId: string, tx: Transaction | undefined, work: (tx: Transaction) => Promise<Change[]>): Promise<void> {
    try {
      await transaction(this.db, tx, async t => {
        for (const it of await work(t)) await this.eventService.publish({ spaceId, entity: 'schemas', ...it }, t);
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
