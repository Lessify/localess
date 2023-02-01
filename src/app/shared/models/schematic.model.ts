import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum SchematicType {
  ROOT = 'ROOT',
  NODE = 'NODE'
}

export interface Schematic {
  id: string;
  name: string;
  type: SchematicType;
  displayName?: string;
  components?: SchematicComponent[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SchematicComponent = SchematicComponentText
  | SchematicComponentTextarea
  | SchematicComponentNumber
  | SchematicComponentColor
  | SchematicComponentDate
  | SchematicComponentDateTime
  | SchematicComponentBoolean
  | SchematicComponentSchematic
  | SchematicComponentOption
  | SchematicComponentOptions
  | SchematicComponentLink;

export enum SchematicComponentKind {
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
  SCHEMATIC = 'SCHEMATIC',
}

export interface ComponentKindDescription {
  name: string
  icon: string
}

export const schematicComponentKindDescriptions: Record<string, ComponentKindDescription> = {
  'TEXT': {name: 'Text', icon: 'title'},
  'TEXTAREA': {name: 'TextArea', icon: 'rtt'},
  'NUMBER': {name: 'Number', icon: 'pin'},
  'COLOR': {name: 'Color', icon: 'colorize'},
  'DATE': {name: 'Date', icon: 'event'},
  'DATETIME': {name: 'Date and Time', icon: 'schedule'},
  'BOOLEAN': {name: 'Boolean', icon: 'toggle_on'},
  'OPTION': {name: 'Single Option', icon: 'list'},
  'OPTIONS': {name: 'Multiple Options', icon: 'list'},
  'LINK': {name: 'Link', icon: 'link'},
  'SCHEMATIC': {name: 'Schematic (Beta)', icon: 'polyline'},
}

export interface SchematicComponentBase {
  name: string;
  kind: SchematicComponentKind;
  displayName?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  translatable? : boolean;
}

export interface SchematicComponentText extends SchematicComponentBase {
  kind: SchematicComponentKind.TEXT;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicComponentTextarea extends SchematicComponentBase {
  kind: SchematicComponentKind.TEXTAREA;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicComponentNumber extends SchematicComponentBase {
  kind: SchematicComponentKind.NUMBER;
  minValue?: number;
  maxValue?: number;
}

export interface SchematicComponentColor extends SchematicComponentBase {
  kind: SchematicComponentKind.COLOR;
}

export interface SchematicComponentDate extends SchematicComponentBase {
  kind: SchematicComponentKind.DATE;
}

export interface SchematicComponentDateTime extends SchematicComponentBase {
  kind: SchematicComponentKind.DATETIME;
}

export interface SchematicComponentBoolean extends SchematicComponentBase {
  kind: SchematicComponentKind.BOOLEAN;
}

export interface SchematicComponentSchematic extends SchematicComponentBase {
  kind: SchematicComponentKind.SCHEMATIC;
  schematics?: string[];
}

export interface SchematicComponentOptionSelectable {
  name: string;
  value: string;
}

export interface SchematicComponentOption extends SchematicComponentBase {
  kind: SchematicComponentKind.OPTION;
  options: SchematicComponentOptionSelectable[];
}

export interface SchematicComponentOptions extends SchematicComponentBase {
  kind: SchematicComponentKind.OPTIONS;
  options: SchematicComponentOptionSelectable[];
  minValues?: number;
  maxValues?: number;
}

export interface SchematicComponentLink extends SchematicComponentBase {
  kind: SchematicComponentKind.LINK
}

// Service

export interface SchematicCreate {
  name: string;
  type: SchematicType;
}

export interface SchematicUpdate {
  name: string;
  displayName?: string;
  components?: SchematicComponent[];
}

// Firestore

export interface SchematicCreateFS {
  name: string;
  type: SchematicType;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export interface SchematicUpdateFS {
  name: string;
  displayName?: string;
  components?: SchematicComponent[];
  updatedAt: FieldValue;
}
