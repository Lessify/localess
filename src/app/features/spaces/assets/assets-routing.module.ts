import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssetsComponent } from './assets.component';

const routes: Routes = [
  {
    path: '',
    component: AssetsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssetsRoutingModule {}
