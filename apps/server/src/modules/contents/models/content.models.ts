import { z } from 'zod';
import { zContentData } from '@localess/shared/zod';

/** No `/` (it separates path segments) and nothing that needs URL encoding. */
const zSlug = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Slugs are letters, digits, - and _')
  .max(200);
/** The folder; null or absent: the root. */
const zParentId = z.uuid().nullable().optional();
const zName = z.string().trim().min(1).max(500);
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
  z.object({ kind: z.literal('DOCUMENT'), parentId: zParentId, name: zName, slug: zSlug, schema: z.string().min(1).max(128) }),
  z.object({ kind: z.literal('FOLDER'), parentId: zParentId, name: zName, slug: zSlug }),
]);
export type ContentCreate = z.infer<typeof zContentCreate>;

/** `PATCH …/contents/:id`: rename and/or move. */
export const zContentPatch = z.object({ name: zName.optional(), slug: zSlug.optional(), parentId: zParentId });
export type ContentPatch = z.infer<typeof zContentPatch>;

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
