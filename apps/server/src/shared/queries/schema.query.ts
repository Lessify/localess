import { and, eq, inArray } from 'drizzle-orm';
import { type SchemaExport, type SchemaField, SchemaType } from '@localess/shared';
import { newUuid } from '../../infra/database/id.js';
import { schemas } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';
import { schemaReferences, type SchemaPushPlan } from '../utils/schema.utils.js';

/*
 * The write of a schema push: the CLI push (schemas) and the schema import task (tasks) apply the same plan, each in
 * its own transaction with its own content `cv` bump and events.
 */

/** Columns written for a pushed schema; absent fields are cleared, like `FieldValue.delete()` did. */
function schemaColumns(schema: SchemaExport) {
  const base = {
    type: schema.type,
    displayName: schema.displayName || null,
    description: schema.description || null,
    labels: schema.labels || null,
  };
  return schema.type === SchemaType.ENUM
    ? { ...base, previewField: null, fields: null, values: schema.values ?? null }
    : { ...base, previewField: schema.previewField || null, fields: schema.fields ?? null, values: null };
}

/** Writes a `planSchemaPush` result (CLI schema push, schema import task). */
export async function applySchemaPushPlan(tx: Transaction, spaceId: string, plan: SchemaPushPlan): Promise<void> {
  if (plan.creates.length) {
    // Exports carry the name as `id`.
    await tx.insert(schemas).values(plan.creates.map(schema => ({ id: newUuid(), spaceId, name: schema.id, ...schemaColumns(schema) })));
  }
  for (const schema of plan.updates) {
    await tx
      .update(schemas)
      .set({ ...schemaColumns(schema) })
      .where(and(eq(schemas.spaceId, spaceId), eq(schemas.name, schema.id)));
  }
  if (plan.deletes.length) {
    await tx.delete(schemas).where(and(eq(schemas.spaceId, spaceId), inArray(schemas.name, plan.deletes)));
  }
}

/**
 * Locks (shared, until the commit) the schemas that the fields of `written` refer to, other than the written schemas
 * themselves, and answers the names among them that are missing or of another type than the field needs: renamed,
 * deleted or never there since the caller checked. A rename or delete of a locked schema waits for the commit and
 * then sees the reference.
 */
export async function lockSchemaReferences(
  tx: Transaction,
  spaceId: string,
  written: { name: string; fields?: SchemaField[] | null }[],
): Promise<string[]> {
  const own = new Set(written.map(it => it.name));
  const wanted = new Map<string, SchemaType>();
  for (const schema of written) {
    for (const [name, type] of schemaReferences(schema.fields ?? [])) if (!own.has(name)) wanted.set(name, type);
  }
  if (!wanted.size) return [];
  const found = await tx
    .select({ name: schemas.name, type: schemas.type })
    .from(schemas)
    .where(and(eq(schemas.spaceId, spaceId), inArray(schemas.name, [...wanted.keys()])))
    .for('share');
  const types = new Map(found.map(it => [it.name, it.type]));
  return [...wanted].filter(([name, type]) => types.get(name) !== type).map(([name]) => name);
}
