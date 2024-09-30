import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchemasComponent } from './schemas.component';
import { EditEnumComponent } from './edit-enum/edit-enum.component';
import { EditCompComponent } from './edit-comp/edit-comp.component';
import { isFormDirtyGuard } from '@shared/guards/dirty-form.guard';

const routes: Routes = [
  {
    path: '',
    component: SchemasComponent,
  },
  {
    path: 'comp/:schemaId',
    component: EditCompComponent,
    canDeactivate: [isFormDirtyGuard],
  },
  {
    path: 'enum/:schemaId',
    component: EditEnumComponent,
    canDeactivate: [isFormDirtyGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SchemasRoutingModule {}
