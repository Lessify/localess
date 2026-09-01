import { z } from 'zod';
import { AssetFileType, SchemaFieldKind, SchemaType } from './schema.model';

const FIELD_NAME_PATTERN = /^[a-z]+[a-zA-Z0-9_]*[a-zA-Z0-9]+$/;
const ID_PATTERN = /^[a-zA-Z]+[a-zA-Z0-9-_.]*[a-zA-Z0-9]+$/;
// Reserved ids collide with the fixed component names in the generated OpenAPI spec.
const RESERVED_SCHEMA_IDS = [
  'Translations',
  'Links',
  'ContentMetadata',
  'ContentReference',
  'ContentRichText',
  'ContentLink',
  'ContentData',
  'ContentAsset',
  'Content',
];
const RESERVED_FIELD_NAMES = ['_id', '_schema'];

export const schemaTypeSchema = z.enum(SchemaType);

export const schemaBaseSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(50)
    .regex(ID_PATTERN)
    .refine(id => !RESERVED_SCHEMA_IDS.some(it => it.toLowerCase() === id.toLowerCase()), { message: 'Reserved schema id' }),
  type: schemaTypeSchema,
  displayName: z.string().max(50).optional(),
  description: z.string().max(250).optional(),
  labels: z.array(z.string().min(2).max(50)).optional(),
});

export const schemaEnumValueSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const schemaFieldKindSchema = z.enum(SchemaFieldKind);

export const schemaFieldBaseSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(30)
    .regex(FIELD_NAME_PATTERN)
    .refine(name => !name.includes('_i18n_'), { message: 'Field name must not contain _i18n_' })
    .refine(name => !RESERVED_FIELD_NAMES.some(it => it.toLowerCase() === name.toLowerCase()), { message: 'Reserved field name' }),
  kind: schemaFieldKindSchema,
  displayName: z.string().max(30).optional(),
  required: z.boolean().optional(),
  description: z.string().max(250).optional(),
  defaultValue: z.string().max(250).optional(),
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

export const schemaFieldRichTextSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.RICH_TEXT),
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

export const schemaFieldOptionSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.OPTION),
  source: z.string(),
});

export const schemaFieldOptionsSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.OPTIONS),
  source: z.string(),
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

export const assetFileTypeSchema = z.enum(AssetFileType);

export const schemaEnumSchema = schemaBaseSchema.extend({
  type: z.literal(SchemaType.ENUM),
  values: z.array(schemaEnumValueSchema).optional(),
});

export const schemaFieldAssetSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.ASSET),
  fileTypes: z.array(assetFileTypeSchema).optional(),
  fileType: assetFileTypeSchema.optional(),
});

export const schemaFieldAssetsSchema = schemaFieldBaseSchema.extend({
  kind: z.literal(SchemaFieldKind.ASSETS),
  fileTypes: z.array(assetFileTypeSchema).optional(),
  fileType: assetFileTypeSchema.optional(),
});

export const schemaFieldSchema = z.union([
  schemaFieldTextSchema,
  schemaFieldTextareaSchema,
  schemaFieldRichTextSchema,
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
  fields: z.array(schemaFieldSchema).optional(),
});

export const schemaSchema = z.union([schemaComponentSchema, schemaEnumSchema]);

export const zSchemaExportArraySchema = z.array(schemaSchema);

export const zSchemaPushSchema = z.object({
  dryRun: z.boolean().optional(),
  type: z.enum(['upsert', 'sync']),
  schemas: zSchemaExportArraySchema,
});
