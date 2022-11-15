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
}

export interface SchematicComponentTranslatable extends SchematicComponentBase{
  translatable? : boolean;
}

export interface SchematicComponentText extends SchematicComponentTranslatable {
  kind: SchematicComponentKind.TEXT;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicComponentTextarea extends SchematicComponentTranslatable {
  kind: SchematicComponentKind.TEXTAREA;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicComponentNumber extends SchematicComponentTranslatable {
  kind: SchematicComponentKind.NUMBER;
  minValue?: number;
  maxValue?: number;
}

export interface SchematicComponentColor extends SchematicComponentTranslatable {
  kind: SchematicComponentKind.COLOR;
}

export interface SchematicComponentDate extends SchematicComponentTranslatable {
  kind: SchematicComponentKind.DATE;
}

export interface SchematicComponentDateTime extends SchematicComponentTranslatable {
  kind: SchematicComponentKind.DATETIME;
}

export interface SchematicComponentBoolean extends SchematicComponentTranslatable {
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
