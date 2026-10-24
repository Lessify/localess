import { z } from 'zod';

import { LOCALESS_FILE_FORMAT, LOCALESS_FILE_VERSION } from './localess-file.model.js';
import { schemaBaseSchema, schemaComponentSchema, schemaEnumSchema } from './schema.zod.js';
import { zTranslationValue } from './translation.zod.js';

// Files stay tolerant (`z.object`): a file written by a newer build may carry a field this one does not know.

export const zLocalessManifest = z.object({
  format: z.literal(LOCALESS_FILE_FORMAT),
  version: z.literal(LOCALESS_FILE_VERSION),
  kind: z.enum(['TRANSLATION', 'SCHEMA']),
  exportedAt: z.string(),
  source: z.object({ spaceId: z.string(), spaceName: z.string(), locales: z.array(z.string()) }),
  count: z.number().int().min(0),
});

/** One line of `translations.jsonl`; the key rule is checked by the import, only for the keys it creates. */
export const zTranslationLine = z.object({
  key: z.string().min(1),
  locales: z.record(z.string(), zTranslationValue),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

const zSchemaName = schemaBaseSchema.shape.id;

/** One line of `schemas.jsonl`: the export schema with `name` in place of `id`. */
export const zSchemaLine = z.union([
  schemaComponentSchema.omit({ id: true }).extend({ name: zSchemaName }),
  schemaEnumSchema.omit({ id: true }).extend({ name: zSchemaName }),
]);
