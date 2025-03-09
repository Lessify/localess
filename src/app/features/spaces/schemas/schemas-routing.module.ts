import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { isFormDirtyGuard } from '@shared/guards/dirty-form.guard';
import { EditCompComponent } from './edit-comp/edit-comp.component';
import { EditEnumComponent } from './edit-enum/edit-enum.component';
import { SchemasComponent } from './schemas.component';

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
