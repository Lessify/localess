import { and, eq, inArray } from 'drizzle-orm';
import { SchemaExport, SchemaType } from '@localess/shared';
import { newUuid } from '../../infra/database/id.js';
import { schemas } from '../../infra/database/schema.js';
import type { Transaction } from '../../infra/database/transaction.js';
import type { SchemaPushPlan } from '../utils/schema.utils.js';

/*
 * The write of a schema push: the CLI push (schemas) and the schema import task (tasks) apply the same plan, each in
 * its own transaction with its own content `cv` bump and events.
 */

/** Columns written for a pushed schema; absent fields are cleared, like `FieldValue.delete()` did. */
function schemaColumns(schema: SchemaExport) {
  const component = schema.type === SchemaType.ROOT || schema.type === SchemaType.NODE;
  return {
    type: schema.type,
    displayName: schema.displayName || null,
    description: schema.description || null,
    labels: schema.labels || null,
    previewField: component ? (schema as { previewField?: string }).previewField || null : null,
    fields: component ? ((schema as { fields?: unknown[] }).fields ?? null) : null,
    values: !component ? ((schema as { values?: { name: string; value: string }[] }).values ?? null) : null,
  };
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
