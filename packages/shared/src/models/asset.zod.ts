import { z } from 'zod';

import { AssetKind } from './asset.model.js';

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
export const zAssetFolderCreate = z.object({ parentId: zParentId, name: zAssetName }).strict();
export type AssetFolderCreate = z.infer<typeof zAssetFolderCreate>;

/** `PATCH …/assets/:id`. */
export const zAssetUpdate = z.object({ name: zAssetName.optional(), alt: z.string().max(2000).optional() });
export type AssetUpdate = z.infer<typeof zAssetUpdate>;

/** `PUT …/assets/:id/parent`. */
export const zAssetMove = z.object({ parentId: z.uuid().nullable() });
export type AssetMove = z.infer<typeof zAssetMove>;

/** `POST …/assets/files`: the multipart fields before the `file` part. */
export const zAssetUpload = z.object({
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
