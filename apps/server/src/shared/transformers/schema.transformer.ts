import { type Schema, SchemaType } from '@localess/shared';
import { present } from '../../infra/database/without-nulls.js';
import type { SchemaEntity } from '../entities/schema.entity.js';

/**
 * A `schemas` row as the shared model, the App API's DTO: `id` the UUID, `name` the reference key, `null` columns
 * left out, `spaceId` dropped, and only what the type has (fields and a preview field for ROOT and NODE, values for
 * ENUM).
 */
export function toSchema(entity: SchemaEntity): Schema {
  const base = {
    id: entity.id,
    name: entity.name,
    ...present({ displayName: entity.displayName, description: entity.description, labels: entity.labels }),
  };
  const timestamps = { createdAt: entity.createdAt.toISOString(), updatedAt: entity.updatedAt.toISOString() };
  return entity.type === 'ENUM'
    ? { ...base, type: SchemaType.ENUM, ...present({ values: entity.values }), ...timestamps }
    : {
        ...base,
        type: entity.type === 'ROOT' ? SchemaType.ROOT : SchemaType.NODE,
        ...present({ previewField: entity.previewField, fields: entity.fields }),
        ...timestamps,
      };
}

/** Schemas keyed by `name`, which is what content (`schema`, `_schema`) and fields (`schemas`, `source`) refer to. */
export function schemasByName(entities: SchemaEntity[]): Map<string, Schema> {
  return new Map(entities.map(entity => [entity.name, toSchema(entity)]));
}
