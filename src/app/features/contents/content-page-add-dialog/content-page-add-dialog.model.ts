import {Schematic} from '@shared/models/schematic.model';

export interface ContentPageAddDialogModel {
  schematics: Schematic[]
  reservedNames: string[];
  reservedSlugs: string[];
}
