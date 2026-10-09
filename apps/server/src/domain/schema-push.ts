import { and, eq, inArray } from 'drizzle-orm';
import { SchemaExport, SchemaType } from '@localess/shared';
import type { Database } from '../database/database.module.js';
import { schemas } from '../database/schema.js';
import type { SchemaPushPlan } from './lib/schema.utils.js';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

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
    await tx.insert(schemas).values(plan.creates.map(schema => ({ spaceId, id: schema.id, ...schemaColumns(schema) })));
  }
  for (const schema of plan.updates) {
    await tx
      .update(schemas)
      .set({ ...schemaColumns(schema), updatedAt: new Date() })
      .where(and(eq(schemas.spaceId, spaceId), eq(schemas.id, schema.id)));
  }
  if (plan.deletes.length) {
    await tx.delete(schemas).where(and(eq(schemas.spaceId, spaceId), inArray(schemas.id, plan.deletes)));
  }
}
