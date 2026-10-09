import type { Schema } from '@localess/shared';
import type { schemas } from '../../infra/database/schema.js';
import { withoutNulls } from '../../infra/database/without-nulls.js';

/** A `schemas` row as the shared model (see `without-nulls.ts` for the timestamp cast). */
export function schemaFromRow(row: typeof schemas.$inferSelect): Schema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, ...rest } = withoutNulls(row);
  return rest as unknown as Schema;
}
