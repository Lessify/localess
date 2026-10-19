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

// App API requests.

/** No `/` (it separates path segments) and nothing that needs URL encoding. */
const zSlug = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Slugs are letters, digits, - and _')
  .max(200);
/** The folder; null or absent: the root. */
const zParentId = z.uuid().nullable().optional();
const zContentName = z.string().trim().min(1).max(500);
const zIds = z.array(z.string().max(128)).max(10_000);

/** `GET …/contents`: `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?ids=a,b`, `?limit=`. */
export const zContentListQuery = z.object({
  // '': the root's children; absent: any parent.
  parentId: z.union([z.uuid(), z.literal('')]).optional(),
  kind: z.enum(['FOLDER', 'DOCUMENT']).optional(),
  name: z.string().max(500).optional(),
  ids: z
    .string()
    .transform(it => (it ? it.split(',') : []))
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});
export type ContentListQuery = z.infer<typeof zContentListQuery>;

/** `POST …/contents`: a document or a folder. */
export const zContentCreate = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('DOCUMENT'), parentId: zParentId, name: zContentName, slug: zSlug, schema: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('FOLDER'), parentId: zParentId, name: zContentName, slug: zSlug }),
]);
export type ContentCreate = z.infer<typeof zContentCreate>;
/** What the Add Document dialog asks for (the kind and the folder come from where it was opened). */
export type ContentDocumentCreate = Omit<Extract<ContentCreate, { kind: 'DOCUMENT' }>, 'kind' | 'parentId'>;
/** What the Add Folder dialog asks for. */
export type ContentFolderCreate = Omit<Extract<ContentCreate, { kind: 'FOLDER' }>, 'kind' | 'parentId'>;

/** `PATCH …/contents/:id`: rename and/or move. */
export const zContentUpdate = z.object({ name: zContentName.optional(), slug: zSlug.optional(), parentId: zParentId });
export type ContentUpdate = z.infer<typeof zContentUpdate>;

/**
 * `PUT …/contents/:id/data`. Blocks of known values (`zContentData`): `_id`, `_schema`, and each value one of the
 * shapes the editor stores. `assets`, `links`, `references`: still accepted from clients that send them (an editor tab
 * open across a deploy), and ignored: the server works them out from the data.
 */
export const zContentDataUpdate = z.object({
  data: zContentData,
  assets: zIds.optional(),
  links: zIds.optional(),
  references: zIds.optional(),
});
export type ContentDataUpdate = z.infer<typeof zContentDataUpdate>;
