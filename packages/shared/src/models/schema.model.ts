import type { Timestamp } from './timestamp.js';

export enum SchemaType {
  ROOT = 'ROOT',
  NODE = 'NODE',
  ENUM = 'ENUM',
}

export type Schema = SchemaComponent | SchemaEnum;

export interface SchemaBase {
  /** Row id (UUIDv7), used by the App API only. */
  id: string;
  /**
   * Unique per space; what content (`schema`, `_schema`), fields (`schemas`, `source`), the SDK and Code as Source
   * refer to. Exports carry it as `id`.
   */
  name: string;
  type: SchemaType;
  displayName?: string;
  description?: string;
  labels?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SchemaComponent extends SchemaBase {
  type: SchemaType.ROOT | SchemaType.NODE;
  previewField?: string;
  fields?: SchemaField[];
}

export interface SchemaEnum extends SchemaBase {
  type: SchemaType.ENUM;
  values?: SchemaEnumValue[];
}

export interface SchemaEnumValue {
  name: string;
  value: string;
}

export type SchemaField =
  | SchemaFieldText
  | SchemaFieldTextarea
  | SchemaFieldRichText
  | SchemaFieldMarkdown
  | SchemaFieldNumber
  | SchemaFieldColor
  | SchemaFieldDate
  | SchemaFieldDateTime
  | SchemaFieldBoolean
  | SchemaFieldSchema
  | SchemaFieldSchemas
  | SchemaFieldOption
  | SchemaFieldOptions
  | SchemaFieldLink
  | SchemaFieldReference
  | SchemaFieldReferences
  | SchemaFieldAsset
  | SchemaFieldAssets;

export enum SchemaFieldKind {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  RICH_TEXT = 'RICH_TEXT',
  MARKDOWN = 'MARKDOWN',
  NUMBER = 'NUMBER',
  COLOR = 'COLOR',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  OPTION = 'OPTION',
  OPTIONS = 'OPTIONS',
  LINK = 'LINK',
  REFERENCE = 'REFERENCE',
  REFERENCES = 'REFERENCES',
  ASSET = 'ASSET',
  ASSETS = 'ASSETS',
  SCHEMA = 'SCHEMA',
  SCHEMAS = 'SCHEMAS',
}

export interface SchemaFieldBase {
  name: string;
  kind: SchemaFieldKind;
  displayName?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
}

/**
 * Mixed into the field kinds that can hold a value per locale. REFERENCE, REFERENCES, SCHEMA and
 * SCHEMAS can't: their value is shared by every locale, and nested blocks translate their own fields.
 */
export interface SchemaFieldTranslatable {
  translatable?: boolean;
}

/** Field kinds that can never be translatable. */
const UNTRANSLATABLE_FIELD_KINDS: ReadonlySet<SchemaFieldKind> = new Set([
  SchemaFieldKind.REFERENCE,
  SchemaFieldKind.REFERENCES,
  SchemaFieldKind.SCHEMA,
  SchemaFieldKind.SCHEMAS,
]);

/**
 * Whether a field holds a value per locale. Always false for REFERENCE, REFERENCES, SCHEMA and
 * SCHEMAS, even when stored data still carries a leftover `translatable` flag on them.
 * @param {SchemaField} field schema field
 * @return {boolean} true when the field is translatable
 */
export function isFieldTranslatable(field: SchemaField): boolean {
  return !UNTRANSLATABLE_FIELD_KINDS.has(field.kind) && 'translatable' in field && field.translatable === true;
}

export interface SchemaFieldText extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.TEXT;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldTextarea extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.TEXTAREA;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldRichText extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.RICH_TEXT;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldMarkdown extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.MARKDOWN;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldNumber extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.NUMBER;
  minValue?: number;
  maxValue?: number;
}

export interface SchemaFieldColor extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.COLOR;
}

export interface SchemaFieldDate extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.DATE;
}

export interface SchemaFieldDateTime extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.DATETIME;
}

export interface SchemaFieldBoolean extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.BOOLEAN;
}

export interface SchemaFieldSchemas extends SchemaFieldBase {
  kind: SchemaFieldKind.SCHEMAS;
  schemas?: string[];
}

export interface SchemaFieldSchema extends SchemaFieldBase {
  kind: SchemaFieldKind.SCHEMA;
  schemas?: string[];
}

export interface SchemaFieldOption extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.OPTION;
  source: string;
}

export interface SchemaFieldOptions extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.OPTIONS;
  source: string;
  minValues?: number;
  maxValues?: number;
}

export interface SchemaFieldLink extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.LINK;
}

export interface SchemaFieldReference extends SchemaFieldBase {
  kind: SchemaFieldKind.REFERENCE;
  path?: string;
}

export interface SchemaFieldReferences extends SchemaFieldBase {
  kind: SchemaFieldKind.REFERENCES;
  path?: string;
}

export interface SchemaFieldAsset extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.ASSET;
  fileTypes?: AssetFileType[];
  fileType?: AssetFileType;
}

export interface SchemaFieldAssets extends SchemaFieldBase, SchemaFieldTranslatable {
  kind: SchemaFieldKind.ASSETS;
  fileTypes?: AssetFileType[];
  fileType?: AssetFileType;
}

export enum AssetFileType {
  ANY = 'ANY',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  APPLICATION = 'APPLICATION',
}

// Export and Import (files, the public API, the SDK and Code as Source): a schema is identified by its name,
// carried as `id`; the row UUID never leaves the App API.
export type SchemaExport = SchemaComponentExport | SchemaEnumExport;
export type SchemaComponentExport = Omit<SchemaComponent, 'id' | 'name' | 'createdAt' | 'updatedAt'> & { /** The name. */ id: string };

export type SchemaEnumExport = Omit<SchemaEnum, 'id' | 'name' | 'createdAt' | 'updatedAt'> & { /** The name. */ id: string };

// App API requests
export interface SchemaCreate {
  name: string;
  type: SchemaType;
  displayName?: string;
}

export type SchemaComponentUpdate = Omit<SchemaComponent, 'id' | 'name' | 'type' | 'createdAt' | 'updatedAt'>;

export type SchemaEnumUpdate = Omit<SchemaEnum, 'id' | 'name' | 'type' | 'createdAt' | 'updatedAt'>;

/** Field kinds whose value is an array. */
export function isSchemaArray(schema: SchemaField): boolean {
  return (
    schema.kind === SchemaFieldKind.SCHEMAS ||
    schema.kind === SchemaFieldKind.REFERENCES ||
    schema.kind === SchemaFieldKind.OPTIONS ||
    schema.kind === SchemaFieldKind.ASSETS
  );
}
