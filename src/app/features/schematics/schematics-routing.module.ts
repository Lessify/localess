import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SchematicsComponent} from './schematics.component';
import {SchematicEditComponent} from "./schematic-edit/schematic-edit.component";

const routes: Routes = [
  {
    path: '',
    component: SchematicsComponent
  },
  {
    path: ':schematicId',
    component: SchematicEditComponent
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SchematicsRoutingModule {}
