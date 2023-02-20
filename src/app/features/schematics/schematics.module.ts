import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {SchematicsComponent} from './schematics.component';
import {SchematicsRoutingModule} from './schematics-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchematicService} from '@shared/services/schematic.service';
import {SchematicAddDialogComponent} from './schematic-add-dialog/schematic-add-dialog.component';
import {SchematicComponentEditComponent} from './schematic-component-edit/schematic-component-edit.component';
import {SchematicEditComponent} from "./schematic-edit/schematic-edit.component";

@NgModule({
  declarations: [SchematicsComponent, SchematicAddDialogComponent, SchematicComponentEditComponent, SchematicEditComponent],
  imports: [CommonModule, SharedModule, SchematicsRoutingModule],
  providers: [SpaceService, SchematicService]
})
export class SchematicsModule {
}
