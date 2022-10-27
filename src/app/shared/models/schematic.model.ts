import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum SchematicType {
  ROOT = 'ROOT',
  NODE = 'NODE'
}

export interface Schematic {
  id: string;
  name: string;
  type: SchematicType;
  components?: SchematicComponent[];

  createdOn: Timestamp;
  updatedOn: Timestamp;
}

export type SchematicComponent = SchematicComponentNumber | SchematicComponentText | SchematicComponentTextarea | SchematicComponentDate | SchematicComponentBoolean;

export enum SchematicComponentKind {
  NUMBER = 'NUMBER',
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN'
}

export interface SchematicComponentBase {
  name: string;
  kind: SchematicComponentKind;
  displayName?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
}

export interface SchematicComponentNumber extends SchematicComponentBase {
  kind: SchematicComponentKind.NUMBER;
  minValue?: number;
  maxValue?: number;
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

export interface SchematicComponentDate extends SchematicComponentBase {
  kind: SchematicComponentKind.DATE;
}

export interface SchematicComponentBoolean extends SchematicComponentBase {
  kind: SchematicComponentKind.BOOLEAN;
}

// Service

export interface SchematicCreate {
  name: string;
  type: SchematicType;
}

export interface SchematicUpdate {
  name: string;
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
  updatedOn: FieldValue;
}
