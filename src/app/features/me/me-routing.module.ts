import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MeComponent} from './me.component';

const routes: Routes = [
  {
    path: '',
    component: MeComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MeRoutingModule {}
