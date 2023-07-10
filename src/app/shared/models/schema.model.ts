import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum SchemaType {
  ROOT = 'ROOT',
  NODE = 'NODE'
}

export interface Schema {
  id: string;
  name: string;
  type: SchemaType;
  displayName?: string;
  previewField?: string;
  fields?: SchemaField[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SchemaField = SchemaFieldText
  | SchemaFieldTextarea
  | SchemaFieldMarkdown
  | SchemaFieldNumber
  | SchemaFieldColor
  | SchemaFieldDate
  | SchemaFieldDateTime
  | SchemaFieldBoolean
  | SchemaFieldSchema
  | SchemasFieldSchema
  | SchemaFieldOption
  | SchemaFieldOptions
  | SchemaFieldLink
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
  ASSET = 'ASSET',
  ASSETS = 'ASSETS',
  SCHEMA = 'SCHEMA',
  SCHEMAS = 'SCHEMAS',
}

export interface FieldKindDescription {
  name: string
  icon: string
}

export const schemaFieldKindDescriptions: Record<string, FieldKindDescription> = {
  'TEXT': {name: 'Text', icon: 'title'},
  'TEXTAREA': {name: 'TextArea', icon: 'rtt'},
  'MARKDOWN': {name: 'Markdown', icon: 'functions'},
  'NUMBER': {name: 'Number', icon: 'pin'},
  'COLOR': {name: 'Color', icon: 'colorize'},
  'DATE': {name: 'Date', icon: 'event'},
  'DATETIME': {name: 'Date and Time', icon: 'schedule'},
  'BOOLEAN': {name: 'Boolean', icon: 'toggle_on'},
  'OPTION': {name: 'Single Option', icon: 'list'},
  'OPTIONS': {name: 'Multiple Options', icon: 'list'},
  'LINK': {name: 'Link', icon: 'link'},
  'ASSET': {name: 'Asset ( One )', icon: 'attachment'},
  'ASSETS': {name: 'Assets ( Many )', icon: 'attachment'},
  'SCHEMA': {name: 'Schema ( One )', icon: 'polyline'},
  'SCHEMAS': {name: 'Schemas ( Many )', icon: 'polyline'},
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

export interface SchemasFieldSchema extends SchemaFieldBase {
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

// Service

export interface SchemaCreate {
  name: string;
  displayName?: string;
  type: SchemaType;
}

export interface SchemaUpdate {
  name: string;
  displayName?: string;
  previewField?: string;
  fields?: SchemaField[];
}

// Firestore

export interface SchemaCreateFS {
  name: string;
  displayName?: string;
  type: SchemaType;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface SchemaUpdateFS {
  name: string;
  displayName?: string;
  previewField?: string | FieldValue;
  fields?: SchemaField[];
  updatedAt: FieldValue;
}
