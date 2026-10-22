import { z } from 'zod';

import { ASSET_SORT_FIELDS, AssetKind } from './asset.model.js';
import { zPageable, zSearch } from './page.zod.js';
import { AssetFileType } from './schema.model.js';

export const assetBaseSchema = z.object({
  id: z.string(),
  kind: z.enum(AssetKind),
  name: z.string(),
  parentPath: z.string(),
});

export const assetFolderSchema = assetBaseSchema.extend({
  kind: z.literal(AssetKind.FOLDER),
});

export const assetMetadataSchema = z.object({
  format: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const assetFileSchema = assetBaseSchema.extend({
  kind: z.literal(AssetKind.FILE),
  extension: z.string(),
  type: z.string(),
  size: z.number(),
  alt: z.string().optional(),
  metadata: assetMetadataSchema.optional(),
  source: z.string().optional(),
});

export const assetSchema = z.union([assetFileSchema, assetFolderSchema]);

export const zAssetExportArraySchema = z.array(assetSchema);

// App API requests.

/** The folder; null or absent: the root. */
const zParentId = z.uuid().nullable().optional();
const zAssetName = z.string().trim().min(1).max(500);

/**
 * `GET …/assets`: one page, folders first, then by name unless sorted otherwise. `?parentId=` (absent: the root),
 * `?deep=true` (everything under it), `?kind=`, `?fileType=` (files of that type; folders stay listed), `?search=` (the
 * name, anywhere), `?ids=a,b` (those assets wherever they are).
 */
export const zAssetPageable = zPageable(ASSET_SORT_FIELDS, 'name').extend({
  // The folder; absent: the root.
  parentId: z.uuid().optional(),
  // true: everything under the folder at any depth (under the root: the whole space); else its children only.
  deep: z
    .enum(['true', 'false'])
    .optional()
    .transform(it => it === 'true'),
  kind: z.enum(['FOLDER', 'FILE']).optional(),
  fileType: z.enum(AssetFileType).optional(),
  search: zSearch,
  // Until the Asset fields read the light list of files: the assets they show, wherever they are.
  ids: z
    .string()
    .transform(it => (it ? it.split(',') : []))
    .pipe(z.array(z.uuid()).max(100))
    .optional(),
});
export type AssetPageable = z.infer<typeof zAssetPageable>;

/** `GET …/assets/count?kind=`: every asset, or one kind. */
export const zAssetCountQuery = z.object({ kind: z.enum(['FOLDER', 'FILE']).optional() });
export type AssetCountQuery = z.infer<typeof zAssetCountQuery>;

/** `POST …/assets/folders`. A folder is a name in a place: file fields are refused, not ignored. */
export const zAssetFolderCreate = z.strictObject({ parentId: zParentId, name: zAssetName });
export type AssetFolderCreate = z.infer<typeof zAssetFolderCreate>;

/** `PATCH …/assets/:assetId`. */
export const zAssetUpdate = z.strictObject({ name: zAssetName.optional(), alt: z.string().max(2000).optional() });
export type AssetUpdate = z.infer<typeof zAssetUpdate>;

/** `PUT …/assets/:assetId/parent`. */
export const zAssetMove = z.strictObject({ parentId: z.uuid().nullable() });
export type AssetMove = z.infer<typeof zAssetMove>;

/** `POST …/assets/files`: the multipart fields before the `file` part; an unknown field is refused. */
export const zAssetUpload = z.strictObject({
  // A multipart field: absent or '' for the root.
  parentId: z.union([z.uuid(), z.literal('')]).optional(),
  name: zAssetName.optional(),
  extension: z
    .string()
    .regex(/^(\.[^./\\\s]{1,31})?$/, 'extension is empty or starts with a dot (.png)')
    .optional(),
  alt: z.string().max(2000).optional(),
  source: z.string().max(2048).optional(),
});
export type AssetUpload = z.infer<typeof zAssetUpload>;
