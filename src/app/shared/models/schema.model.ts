import { Timestamp } from '@angular/fire/firestore';

export function sortSchema(a: Schema, b: Schema): number {
  if (a.displayName && b.displayName) {
    return a.displayName.localeCompare(b.displayName);
  } else {
    return a.id.localeCompare(b.id);
  }
}

export function sortSchemaEnumValue(a: SchemaEnumValue, b: SchemaEnumValue): number {
  return a.name.localeCompare(b.name);
}

export enum SchemaType {
  ROOT = 'ROOT',
  NODE = 'NODE',
  ENUM = 'ENUM',
}

export interface FieldTypeDescription {
  name: string;
  description: string;
  icon: string;
}

export const schemaTypeDescriptions: Record<SchemaType, FieldTypeDescription> = {
  ROOT: { name: 'Root', icon: 'margin', description: 'Root schema, top level schema' },
  NODE: { name: 'Node', icon: 'polyline', description: 'Node schema, nested schema' },
  ENUM: { name: 'Enum', icon: 'list', description: 'Enum schema, list of values' },
};

export type Schema = SchemaComponent | SchemaEnum;

export interface SchemaBase {
  id: string;
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

export interface FieldKindDescription {
  name: string;
  description: string;
  icon: string;
}

export const schemaFieldKindDescriptions: Record<SchemaFieldKind, FieldKindDescription> = {
  TEXT: { name: 'Text', icon: 'title', description: 'Short text field, titles or headlines' },
  TEXTAREA: { name: 'Text Area', icon: 'rtt', description: 'Long text field, description' },
  RICH_TEXT: {
    name: 'Rich Text (Beta)',
    icon: 'format_shapes',
    description: 'Rich text field, text that includes formatting commands for page layout such as bold, underline, italic, etc.',
  },
  MARKDOWN: { name: 'Markdown', icon: 'markdown', description: 'Markdown text field, description' },
  NUMBER: { name: 'Number', icon: 'pin', description: 'Number field, amount or quantity' },
  COLOR: { name: 'Color', icon: 'colorize', description: 'Color field, background or text color' },
  DATE: { name: 'Date', icon: 'event', description: 'Date field, calendar date picker' },
  DATETIME: { name: 'Date and Time', icon: 'schedule', description: 'Date and time field, calendar date and time picker' },
  BOOLEAN: { name: 'Boolean', icon: 'toggle_on', description: 'Boolean field, true or false' },
  OPTION: { name: 'Option (One)', icon: 'list', description: 'Single selection field, dropdown' },
  OPTIONS: { name: 'Options (Multiple)', icon: 'list', description: 'Multiple selection field, dropdown' },
  LINK: { name: 'Link', icon: 'link', description: 'Link field, external URL or internal resource' },
  REFERENCE: { name: 'Reference (One)', icon: 'dataset_linked', description: 'Reference field, to a internal resource' },
  REFERENCES: { name: 'References (Multiple)', icon: 'dataset_linked', description: 'References field, to multiple internal resources' },
  ASSET: { name: 'Asset (One)', icon: 'attachment', description: 'Asset field, image, video or file' },
  ASSETS: { name: 'Assets (Multiple)', icon: 'attachment', description: 'Assets field, multiple images, videos or files' },
  SCHEMA: { name: 'Schema (One)', icon: 'polyline', description: 'Schema field, to a internal schema' },
  SCHEMAS: { name: 'Schemas (Multiple)', icon: 'polyline', description: 'Schemas field, to multiple internal schemas' },
};

export const assetFileTypeDescriptions: Record<AssetFileType, FieldKindDescription> = {
  ANY: { name: 'Any File', icon: 'file_present', description: 'All type of files.' },
  IMAGE: { name: 'Images', icon: 'image', description: 'Image or graphical files including both bitmap and vector still images.' },
  VIDEO: { name: 'Videos', icon: 'video_file', description: 'Videos files.' },
  AUDIO: { name: 'Audio', icon: 'audio_file', description: 'Audio or music files.' },
  TEXT: {
    name: 'Text Documents',
    icon: 'description',
    description: 'Text-only files including any human-readable content, source code, or textual data.',
  },
  APPLICATION: {
    name: 'Application Documents',
    icon: 'file_present',
    description: "Any kind of binary data that doesn't fall explicitly into one of the other types.",
  },
};

export interface SchemaFieldBase {
  name: string;
  kind: SchemaFieldKind;
  displayName?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  translatable?: boolean;
}

export interface SchemaFieldText extends SchemaFieldBase {
  kind: SchemaFieldKind.TEXT;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldTextarea extends SchemaFieldBase {
  kind: SchemaFieldKind.TEXTAREA;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldRichText extends SchemaFieldBase {
  kind: SchemaFieldKind.RICH_TEXT;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldMarkdown extends SchemaFieldBase {
  kind: SchemaFieldKind.MARKDOWN;
  minLength?: number;
  maxLength?: number;
}

export interface SchemaFieldNumber extends SchemaFieldBase {
  kind: SchemaFieldKind.NUMBER;
  minValue?: number;
  maxValue?: number;
}

export interface SchemaFieldColor extends SchemaFieldBase {
  kind: SchemaFieldKind.COLOR;
}

export interface SchemaFieldDate extends SchemaFieldBase {
  kind: SchemaFieldKind.DATE;
}

export interface SchemaFieldDateTime extends SchemaFieldBase {
  kind: SchemaFieldKind.DATETIME;
}

export interface SchemaFieldBoolean extends SchemaFieldBase {
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

export interface SchemaFieldOptionSelectable {
  name: string;
  value: string;
}

export interface SchemaFieldOption extends SchemaFieldBase {
  kind: SchemaFieldKind.OPTION;
  source: string | 'self';
  options?: SchemaFieldOptionSelectable[];
}

export interface SchemaFieldOptions extends SchemaFieldBase {
  kind: SchemaFieldKind.OPTIONS;
  source: string | 'self';
  options?: SchemaFieldOptionSelectable[];
  minValues?: number;
  maxValues?: number;
}

export interface SchemaFieldLink extends SchemaFieldBase {
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

export interface SchemaFieldAsset extends SchemaFieldBase {
  kind: SchemaFieldKind.ASSET;
  fileTypes?: AssetFileType[];
}

export interface SchemaFieldAssets extends SchemaFieldBase {
  kind: SchemaFieldKind.ASSETS;
  fileTypes?: AssetFileType[];
}

export enum AssetFileType {
  ANY = 'ANY',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  APPLICATION = 'APPLICATION',
}

// Service
export type SchemaCreate = Omit<Schema, 'createdAt' | 'updatedAt'>;

export type SchemaComponentUpdate = Omit<SchemaComponent, 'id' | 'type' | 'createdAt' | 'updatedAt'>;

export type SchemaEnumUpdate = Omit<SchemaEnum, 'id' | 'type' | 'createdAt' | 'updatedAt'>;

// Firestore
export type SchemaCreateFS = Omit<Schema, 'id'>;

export type SchemaComponentUpdateIdFS = Omit<SchemaComponent, 'id'>;
export type SchemaEnumUpdateIdFS = Omit<SchemaEnum, 'id'>;
