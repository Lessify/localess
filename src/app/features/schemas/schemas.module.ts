import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SharedModule} from '@shared/shared.module';
import {SchemasComponent} from './schemas.component';
import {SchemasRoutingModule} from './schemas-routing.module';
import {SpaceService} from '@shared/services/space.service';
import {SchemaService} from '@shared/services/schema.service';
import {EditComponent} from './edit/edit.component';
import {AddDialogComponent} from './add-dialog/add-dialog.component';
import {EditFieldComponent} from './edit-field/edit-field.component';

@NgModule({
  declarations: [SchemasComponent, AddDialogComponent, EditFieldComponent, EditComponent],
  imports: [CommonModule, SharedModule, SchemasRoutingModule],
  providers: [SpaceService, SchemaService]
})
export class SchemasModule {
}
