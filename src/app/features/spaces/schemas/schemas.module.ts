import { NgModule } from '@angular/core';

import { SharedModule } from '@shared/shared.module';
import { SchemasComponent } from './schemas.component';
import { SchemasRoutingModule } from './schemas-routing.module';
import { SpaceService } from '@shared/services/space.service';
import { SchemaService } from '@shared/services/schema.service';
import { AddDialogComponent } from './add-dialog/add-dialog.component';
import { EditFieldComponent } from './shared/edit-field/edit-field.component';
import { ExportDialogComponent } from './export-dialog/export-dialog.component';
import { ImportDialogComponent } from './import-dialog/import-dialog.component';
import { TaskService } from '@shared/services/task.service';
import { AssetService } from '@shared/services/asset.service';
import { EditEnumComponent } from './edit-enum/edit-enum.component';
import { EditCompComponent } from './edit-comp/edit-comp.component';
import { EditIdDialogComponent } from './edit-id-dialog';
import { EditValueComponent } from './shared/edit-value/edit-value.component';

@NgModule({
  declarations: [
    SchemasComponent,
    AddDialogComponent,
    EditIdDialogComponent,
    EditFieldComponent,
    EditValueComponent,
    EditCompComponent,
    EditEnumComponent,
    ExportDialogComponent,
    ImportDialogComponent,
  ],
  imports: [SharedModule, SchemasRoutingModule],
  providers: [SpaceService, SchemaService, TaskService, AssetService],
})
export class SchemasModule {}
