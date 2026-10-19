import { z } from 'zod';
import { type SchemaCreate, SchemaType } from '@localess/shared';
import { schemaEnumValueSchema, schemaFieldSchema } from '@localess/shared/zod';
import { zLabels } from '../../../infra/http/zod.js';

const zSchemaName = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/, 'Schema names are letters, digits, - and _');

/** `GET /api/app/spaces/:spaceId/schemas?type=`. */
export const zSchemaTypeFilter = z.enum(SchemaType).optional();

/** `POST /api/app/spaces/:spaceId/schemas`. */
export const zSchemaCreate = z.object({
  name: zSchemaName,
  type: z.enum(SchemaType),
  displayName: z.string().max(200).optional(),
}) satisfies z.ZodType<SchemaCreate>;

/** `PUT …/schemas/:id`: a component's or an enum's settings. */
export const zSchemaUpdate = z.object({
  displayName: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  labels: zLabels.optional(),
  previewField: z.string().max(200).optional(),
  // The shapes the push and the imports check too; keys a field kind does not have are dropped.
  fields: z.array(schemaFieldSchema).optional(),
  values: z.array(schemaEnumValueSchema).optional(),
});
export type SchemaUpdate = z.infer<typeof zSchemaUpdate>;

/** `PUT …/schemas/:id/name`. */
export const zSchemaRename = z.object({ name: zSchemaName });
export type SchemaRename = z.infer<typeof zSchemaRename>;
