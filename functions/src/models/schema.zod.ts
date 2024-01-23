import { z } from 'zod';
import { SchemaFieldKind, SchemaType } from './schema.model';

export const schemaTypeSchema = z.nativeEnum(SchemaType);

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
  options: z.array(schemaFieldOptionSelectableSchema),
});

export const schemaFieldOptionsSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.OPTIONS),
  options: z.array(schemaFieldOptionSelectableSchema),
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

export const schemaFieldAssetSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.ASSET),
});

export const schemaFieldAssetsSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.ASSETS),
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

export const schemaSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: schemaTypeSchema,
  displayName: z.string().optional(),
  previewField: z.string().optional(),
  previewImage: z.string().optional(),
  fields: z.array(schemaFieldSchema).optional(),
});

export const zSchemaExportArraySchema = z.array(schemaSchema);
