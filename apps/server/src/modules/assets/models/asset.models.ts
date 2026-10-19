import { z } from 'zod';

/** The folder; null or absent: the root. */
const zParentId = z.uuid().nullable().optional();
const zName = z.string().trim().min(1).max(500);

/** `GET …/assets`: `?parentId=` ('' for root), `?kind=`, `?name=` (prefix), `?fileType=image`, `?ids=a,b`, `?limit=`. */
export const zAssetListQuery = z.object({
  // '': the root's children; absent: any parent.
  parentId: z.union([z.uuid(), z.literal('')]).optional(),
  kind: z.enum(['FOLDER', 'FILE']).optional(),
  name: z.string().max(500).optional(),
  fileType: z.string().max(100).optional(),
  ids: z
    .string()
    .transform(it => (it ? it.split(',') : []))
    .optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});
export type AssetListQuery = z.infer<typeof zAssetListQuery>;

/** `POST …/assets/folders`. A folder is a name in a place: file fields are refused, not ignored. */
export const zAssetFolderCreate = z.object({ parentId: zParentId, name: zName }).strict();
export type AssetFolderCreate = z.infer<typeof zAssetFolderCreate>;

/** `PATCH …/assets/:id`. */
export const zAssetUpdate = z.object({ name: zName.optional(), alt: z.string().max(2000).optional() });
export type AssetUpdate = z.infer<typeof zAssetUpdate>;

/** `PUT …/assets/:id/parent`. */
export const zAssetMove = z.object({ parentId: z.uuid().nullable() });
export type AssetMove = z.infer<typeof zAssetMove>;

/** `POST …/assets/files`: the multipart fields before the `file` part. */
export const zAssetUploadFields = z.object({
  // A multipart field: absent or '' for the root.
  parentId: z.union([z.uuid(), z.literal('')]).optional(),
  name: zName.optional(),
  extension: z
    .string()
    .regex(/^(\.[^./\\\s]{1,31})?$/, 'extension is empty or starts with a dot (.png)')
    .optional(),
  alt: z.string().max(2000).optional(),
  source: z.string().max(2048).optional(),
});
export type AssetUploadFields = z.infer<typeof zAssetUploadFields>;
