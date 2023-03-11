import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {SchemasComponent} from './schemas.component';
import {SchemasRoutingModule} from './schemas-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchemaService} from '@shared/services/schema.service';
import {EditComponent} from './edit/edit.component';
import {AddDialogComponent} from './add-dialog/add-dialog.component';
import {FieldEditComponent} from './field-edit/field-edit.component';

@NgModule({
  declarations: [SchemasComponent, AddDialogComponent, FieldEditComponent, EditComponent],
  imports: [CommonModule, SharedModule, SchemasRoutingModule],
  providers: [SpaceService, SchemaService]
})
export class SchemasModule {
}
