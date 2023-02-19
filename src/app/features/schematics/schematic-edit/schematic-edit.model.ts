import {Schematic} from '@shared/models/schematic.model';

export interface SchematicEditModel {
  schematic: Schematic;
  schematics: Schematic[];
  reservedNames: string[]
}
