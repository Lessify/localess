import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {SchematicsComponent} from './schematics.component';
import {SchematicsRoutingModule} from './schematics-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchematicService} from '@shared/services/schematic.service';
import {SchematicAddDialogComponent} from './schematic-add-dialog/schematic-add-dialog.component';
import {
  SchematicEditDialogComponent
} from './schematic-edit-dialog/schematic-edit-dialog.component';

@NgModule({
    declarations: [SchematicsComponent, SchematicAddDialogComponent, SchematicEditDialogComponent],
    imports: [CommonModule, SharedModule, SchematicsRoutingModule],
    providers: [SchematicService, SpaceService]
})
export class SchematicsModule {
}
