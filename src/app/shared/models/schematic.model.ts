import {Timestamp} from '@angular/fire/firestore';

export enum SchematicKind {
  NUMBER = 'NUMBER',
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN'
}

export interface Schematic {
  kind: SchematicKind;
  displayName?: string;
  required?: boolean;
  description?: string;

}

export interface SchematicNumber extends Schematic {
  kind: SchematicKind.NUMBER;
  defaultValue?: number;
  minValue?: number;
  maxValue?: number;
}

export interface SchematicText extends Schematic {
  kind: SchematicKind.TEXT;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicTextarea extends Schematic {
  kind: SchematicKind.TEXTAREA;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
}

export interface SchematicDate extends Schematic {
  kind: SchematicKind.DATE;
  defaultValue?: string;
}

export interface SchematicBoolean extends Schematic {
  kind: SchematicKind.BOOLEAN;
  defaultValue?: boolean;
}

export type Schematics = { [key: string]: Schematic };

export interface Component {
  id: string;
  name: string;
  schematics: Schematics;

  createdOn: Timestamp;
  updatedOn: Timestamp;
}
