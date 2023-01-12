import {Schematic} from '@shared/models/schematic.model';

export interface PageAddDialogModel {
  schematics: Schematic[]
  reservedNames: string[];
  reservedSlugs: string[];
}
