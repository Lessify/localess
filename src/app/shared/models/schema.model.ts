import { Timestamp } from '@angular/fire/firestore';

export enum SchemaType {
  ROOT = 'ROOT',
  NODE = 'NODE',
  ENUM = 'ENUM',
}

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
  icon: string;
}

export const schemaFieldKindDescriptions: Record<SchemaFieldKind, FieldKindDescription> = {
  TEXT: { name: 'Text', icon: 'title' },
  TEXTAREA: { name: 'TextArea', icon: 'rtt' },
  MARKDOWN: { name: 'Markdown', icon: 'functions' },
  NUMBER: { name: 'Number', icon: 'pin' },
  COLOR: { name: 'Color', icon: 'colorize' },
  DATE: { name: 'Date', icon: 'event' },
  DATETIME: { name: 'Date and Time', icon: 'schedule' },
  BOOLEAN: { name: 'Boolean', icon: 'toggle_on' },
  OPTION: { name: 'Single Option', icon: 'list' },
  OPTIONS: { name: 'Multiple Options', icon: 'list' },
  LINK: { name: 'Link', icon: 'link' },
  REFERENCE: { name: 'Reference (One)', icon: 'link' },
  REFERENCES: { name: 'References (Many)', icon: 'link' },
  ASSET: { name: 'Asset ( One )', icon: 'attachment' },
  ASSETS: { name: 'Assets ( Many )', icon: 'attachment' },
  SCHEMA: { name: 'Schema ( One )', icon: 'polyline' },
  SCHEMAS: { name: 'Schemas ( Many )', icon: 'polyline' },
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
export interface SchemaCreate extends Omit<Schema, 'createdAt' | 'updatedAt'> {}

export interface SchemaComponentUpdate extends Omit<SchemaComponent, 'id' | 'type' | 'createdAt' | 'updatedAt'> {}

export interface SchemaEnumUpdate extends Omit<SchemaEnum, 'id' | 'type' | 'createdAt' | 'updatedAt'> {}

// Firestore
export interface SchemaCreateFS extends Omit<Schema, 'id'> {}

export interface SchemaComponentUpdateIdFS extends Omit<SchemaComponent, 'id'> {}
export interface SchemaEnumUpdateIdFS extends Omit<SchemaEnum, 'id'> {}
