import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SchemasComponent } from './schemas.component';
import { EditComponent } from './edit/edit.component';

const routes: Routes = [
  {
    path: '',
    component: SchemasComponent,
  },
  {
    path: ':schemaId',
    component: EditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SchemasRoutingModule {}
