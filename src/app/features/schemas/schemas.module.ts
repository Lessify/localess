import {NgModule} from '@angular/core';

import {SharedModule} from '@shared/shared.module';
import {SchemasComponent} from './schemas.component';
import {SchemasRoutingModule} from './schemas-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchemaService} from '@shared/services/schema.service';
import {EditComponent} from './edit/edit.component';
import {AddDialogComponent} from './add-dialog/add-dialog.component';
import {EditFieldComponent} from './edit-field/edit-field.component';
import {ExportDialogComponent} from "./export-dialog/export-dialog.component";
import {ImportDialogComponent} from "./import-dialog/import-dialog.component";
import {TaskService} from "@shared/services/task.service";

@NgModule({
  declarations: [SchemasComponent, AddDialogComponent, EditFieldComponent, EditComponent, ExportDialogComponent, ImportDialogComponent],
  imports: [SharedModule, SchemasRoutingModule],
  providers: [SpaceService, SchemaService, TaskService]
})
export class SchemasModule {
}
