import type { Schema } from '@localess/shared';
import type { schemas } from '../../infra/database/schema.js';
import { withoutNulls } from '../../infra/database/without-nulls.js';

type SchemaEntity = typeof schemas.$inferSelect;

/**
 * A `schemas` row as the shared model, the App API's DTO: `id` the UUID, `name` the reference key, `null` columns
 * left out and `spaceId` dropped (see `without-nulls.ts`).
 */
export function toSchema(entity: SchemaEntity): Schema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- space_id is not part of the model
  const { spaceId, ...rest } = withoutNulls(entity);
  return rest as unknown as Schema;
}

/** Schemas keyed by `name`, which is what content (`schema`, `_schema`) and fields (`schemas`, `source`) refer to. */
export function schemasByName(entities: SchemaEntity[]): Map<string, Schema> {
  return new Map(entities.map(entity => [entity.name, toSchema(entity)]));
}
