import { z } from 'zod';
import { AssetKind } from './asset.model';

export const assetBaseSchema = z.object({
  id: z.string(),
  kind: z.nativeEnum(AssetKind),
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
