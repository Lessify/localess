import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SchematicsComponent} from './schematics.component';

const routes: Routes = [
  {
    path: '',
    component: SchematicsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SchematicsRoutingModule {}
