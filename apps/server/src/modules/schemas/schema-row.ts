import type { Schema } from '@localess/shared';
import type { schemas } from '../../infra/database/schema.js';
import { withoutNulls } from '../../infra/database/without-nulls.js';

/** A `schemas` row as the shared model, `id` the UUID and `name` the reference key (see `without-nulls.ts`). */
export function schemaFromRow(row: typeof schemas.$inferSelect): Schema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, ...rest } = withoutNulls(row);
  return rest as unknown as Schema;
}

/** Schemas keyed by `name`, which is what content (`schema`, `_schema`) and fields (`schemas`, `source`) refer to. */
export function schemasByName(rows: (typeof schemas.$inferSelect)[]): Map<string, Schema> {
  return new Map(rows.map(row => [row.name, schemaFromRow(row)]));
}
