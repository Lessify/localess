import { z } from 'zod';
import { AssetFileType, SchemaFieldKind, SchemaType } from './schema.model';

const ID_PATTERN = /^[a-z]+[a-zA-Z0-9_]*[a-zA-Z0-9]+$/;

export const schemaTypeSchema = z.nativeEnum(SchemaType);

export const schemaBaseSchema = z.object({
  id: z.string().regex(ID_PATTERN),
  type: schemaTypeSchema,
  displayName: z.string().optional(),
});

export const schemaEnumValueSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const schemaFieldKindSchema = z.nativeEnum(SchemaFieldKind);

export const schemaFieldBaseSchema = z.object({
  name: z.string(),
  kind: schemaFieldKindSchema,
  displayName: z.string().optional(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  translatable: z.boolean().optional(),
});

export const schemaFieldTextSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.TEXT),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

export const schemaFieldTextareaSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.TEXTAREA),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

export const schemaFieldMarkdownSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.MARKDOWN),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

export const schemaFieldNumberSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.NUMBER),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
});

export const schemaFieldColorSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.COLOR),
});

export const schemaFieldDateSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.DATE),
});

export const schemaFieldDateTimeSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.DATETIME),
});

export const schemaFieldBooleanSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.BOOLEAN),
});

export const schemaFieldSchemasSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.SCHEMAS),
  schemas: z.array(z.string()).optional(),
});

export const schemaFieldSchemaSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.SCHEMA),
  schemas: z.array(z.string()).optional(),
});

export const schemaFieldOptionSelectableSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const schemaFieldOptionSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.OPTION),
  source: z.union([z.string(), z.literal('self')]),
  options: z.array(schemaFieldOptionSelectableSchema).optional(),
});

export const schemaFieldOptionsSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.OPTIONS),
  source: z.union([z.string(), z.literal('self')]),
  options: z.array(schemaFieldOptionSelectableSchema).optional(),
  minValues: z.number().optional(),
  maxValues: z.number().optional(),
});

export const schemaFieldLinkSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.LINK),
});

export const schemaFieldReferenceSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.REFERENCE),
  path: z.string().optional(),
});

export const schemaFieldReferencesSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.REFERENCES),
  path: z.string().optional(),
});

export const assetFileTypeSchema = z.nativeEnum(AssetFileType);

export const schemaEnumSchema = schemaBaseSchema.extend({
  type: z.literal(SchemaType.ENUM),
  values: z.array(schemaEnumValueSchema).optional(),
});

export const schemaFieldAssetSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.ASSET),
  fileTypes: z.array(assetFileTypeSchema).optional(),
});

export const schemaFieldAssetsSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.ASSETS),
  fileTypes: z.array(assetFileTypeSchema).optional(),
});

export const schemaFieldSchema = z.union([
  schemaFieldTextSchema,
  schemaFieldTextareaSchema,
  schemaFieldMarkdownSchema,
  schemaFieldNumberSchema,
  schemaFieldColorSchema,
  schemaFieldDateSchema,
  schemaFieldDateTimeSchema,
  schemaFieldBooleanSchema,
  schemaFieldSchemaSchema,
  schemaFieldSchemasSchema,
  schemaFieldOptionSchema,
  schemaFieldOptionsSchema,
  schemaFieldLinkSchema,
  schemaFieldReferenceSchema,
  schemaFieldReferencesSchema,
  schemaFieldAssetSchema,
  schemaFieldAssetsSchema,
]);

export const schemaComponentSchema = schemaBaseSchema.extend({
  type: z.union([z.literal(SchemaType.ROOT), z.literal(SchemaType.NODE)]),
  previewField: z.string().optional(),
  previewImage: z.string().optional(),
  // fields: z.array(schemaFieldSchema).optional(),
});

export const schemaSchema = z.union([schemaComponentSchema, schemaEnumSchema]);

export const zSchemaExportArraySchema = z.array(schemaSchema);
