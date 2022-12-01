import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum SchematicType {
  ROOT = 'ROOT',
  NODE = 'NODE'
}

export type SchematicComponents = {[key: string]: SchematicComponent};

export interface Schematic {
  id: string;
  name: string;
  type: SchematicType;
  displayName?: string;
  components?: SchematicComponent[];

  createdOn: Timestamp;
  updatedOn: Timestamp;
}

export type SchematicComponent = SchematicComponentText | SchematicComponentTextarea | SchematicComponentNumber | SchematicComponentColor | SchematicComponentDate | SchematicComponentDateTime | SchematicComponentBoolean | SchematicComponentSchematic;

export enum SchematicComponentKind {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  COLOR = 'COLOR',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  SCHEMATIC = 'SCHEMATIC'
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
  schematic?: string;
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
  createdOn: FieldValue;
  updatedOn: FieldValue;
}

export interface SchematicUpdateFS {
  name: string;
  displayName?: string;
  components?: SchematicComponent[];
  updatedOn: FieldValue;
}
