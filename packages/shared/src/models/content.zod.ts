import { z } from 'zod';
import { type ContentData, ContentKind, type ContentRichText, type ContentValue } from './content.model.js';

export const contentDataSchema = z.object({
  _id: z.string(),
  // Optional: blocks stored before `_schema` existed carry only the legacy `schema` key.
  _schema: z.string().optional(),
});

export const contentBaseSchema = z.object({
  id: z.string(),
  kind: z.enum(ContentKind),
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

// Document data as stored (the `contents.data` column): every value is one of the shapes the editor writes.

const zLink = z.object({
  kind: z.literal('LINK'),
  type: z.enum(['url', 'content']),
  target: z.enum(['_blank', '_self']),
  uri: z.string().min(1),
});
const zReference = z.object({ kind: z.literal('REFERENCE'), uri: z.string().min(1) });
const zAsset = z.object({ kind: z.literal('ASSET'), uri: z.string().min(1) });
/**
 * A TipTap node: a `type` at every level, other keys (`text`, `marks`, `attrs`) as TipTap writes them. Never a `kind`,
 * so a broken link (which also has a `type`) is not taken for rich text.
 */
const zRichText: z.ZodType<ContentRichText> = z.lazy(() =>
  z.looseObject({ type: z.string().min(1), kind: z.never().optional(), content: z.array(zRichText).optional() }),
);

/** One field's value, of any of the shapes the editor stores. */
export const zContentValue: z.ZodType<ContentValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    zLink,
    zReference,
    z.array(zReference),
    zAsset,
    z.array(zAsset),
    zContentData,
    z.array(zContentData),
    zRichText,
  ]),
);

/** A block (the root of a document's data, or one inside it): `_id`, `_schema` and values of known shapes, recursively. */
export const zContentData: z.ZodType<ContentData> = z.lazy(() =>
  z.object({ _id: z.string().min(1), _schema: z.string().min(1) }).catchall(zContentValue),
);
