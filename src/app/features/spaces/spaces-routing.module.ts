import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SpacesComponent} from './spaces.component';

const routes: Routes = [
  {
    path: '',
    component: SpacesComponent,
    data: {
      title: 'Space'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SpacesRoutingModule {}
