import {Timestamp} from 'firebase-admin/firestore';

export enum SchemaType {
  ROOT = 'ROOT',
  NODE = 'NODE'
}

export interface Schema {
  id: string;
  name: string;
  type: SchemaType;
  displayName?: string;
  fields?: SchemaField[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SchemaField = SchemaFieldText
  | SchemaFieldTextarea
  | SchemaFieldNumber
  | SchemaFieldColor
  | SchemaFieldDate
  | SchemaFieldDateTime
  | SchemaFieldBoolean
  | SchemasFieldSchema
  | SchemaFieldOption
  | SchemaFieldOptions
  | SchemaFieldLink
  | SchemaFieldAsset
  | SchemaFieldAssets;

export enum SchemaFieldKind {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  COLOR = 'COLOR',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  OPTION = 'OPTION',
  OPTIONS = 'OPTIONS',
  LINK = 'LINK',
  ASSET = 'ASSET',
  ASSETS = 'ASSETS',
  SCHEMAS = 'SCHEMAS',
}

export interface FieldKindDescription {
  name: string
  icon: string
}

export interface SchemaFieldBase {
  name: string;
  kind: SchemaFieldKind;
  displayName?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  translatable? : boolean;
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

export interface SchemasFieldSchema extends SchemaFieldBase {
  kind: SchemaFieldKind.SCHEMAS;
  schemas?: string[];
}

export interface SchemaFieldOptionSelectable {
  name: string;
  value: string;
}

export interface SchemaFieldOption extends SchemaFieldBase {
  kind: SchemaFieldKind.OPTION;
  options: SchemaFieldOptionSelectable[];
}

export interface SchemaFieldOptions extends SchemaFieldBase {
  kind: SchemaFieldKind.OPTIONS;
  options: SchemaFieldOptionSelectable[];
  minValues?: number;
  maxValues?: number;
}

export interface SchemaFieldLink extends SchemaFieldBase {
  kind: SchemaFieldKind.LINK
}

export interface SchemaFieldAsset extends SchemaFieldBase {
  kind: SchemaFieldKind.ASSET
}

export interface SchemaFieldAssets extends SchemaFieldBase {
  kind: SchemaFieldKind.ASSETS
}

