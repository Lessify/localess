import {FieldValue, Timestamp} from '@angular/fire/firestore';

export enum SchematicType {
  ROOT = 'ROOT',
  NODE = 'NODE'
}

export interface Schematic {
  id: string;
  name: string;
  type: SchematicType;
  components?: SchematicComponents;

  createdOn: Timestamp;
  updatedOn: Timestamp;
}

export type SchematicComponents = { [key: string]: SchematicComponent };

export type SchematicComponent = SchematicComponentNumber | SchematicComponentText | SchematicComponentTextarea | SchematicComponentDate | SchematicComponentBoolean;

export enum SchematicComponentKind {
  NUMBER = 'NUMBER',
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN'
}

export interface SchematicComponentBase {
  kind: SchematicComponentKind;
  displayName?: string;
  required?: boolean;
  description?: string;
}

export interface SchematicComponentNumber extends SchematicComponentBase {
  kind: SchematicComponentKind.NUMBER;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
}

export interface SchematicComponentNumber extends SchematicComponentBase {
  kind: SchematicComponentKind.NUMBER;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
}

export interface SchematicComponentText extends SchematicComponentBase {
  kind: SchematicComponentKind.TEXT;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicComponentTextarea extends SchematicComponentBase {
  kind: SchematicComponentKind.TEXTAREA;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicComponentDate extends SchematicComponentBase {
  kind: SchematicComponentKind.DATE;
  defaultValue?: string;
}

export interface SchematicComponentBoolean extends SchematicComponentBase {
  kind: SchematicComponentKind.BOOLEAN;
  defaultValue?: boolean;
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
