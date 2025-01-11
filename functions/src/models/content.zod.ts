import { z } from 'zod';
import { ContentKind } from './content.model';

export const contentDataSchema = z.object({
  _id: z.string(),
  schema: z.string(),
});

export const contentBaseSchema = z.object({
  id: z.string(),
  kind: z.nativeEnum(ContentKind),
  name: z.string(),
  slug: z.string(),
  parentSlug: z.string(),
  fullSlug: z.string(),
});

export const contentDocumentSchema = contentBaseSchema.extend({
  kind: z.literal(ContentKind.DOCUMENT),
  schema: z.string(),
  data: z.string().optional().or(contentDataSchema.optional()),
});

export const contentFolderSchema = contentBaseSchema.extend({
  kind: z.literal(ContentKind.FOLDER),
});

export const contentSchema = z.union([contentDocumentSchema, contentFolderSchema]);

export const zContentExportArraySchema = z.array(contentSchema);
