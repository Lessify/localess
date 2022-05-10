import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {TranslatesComponent} from './translates.component';

const routes: Routes = [
  {
    path: '',
    component: TranslatesComponent,
    data: {
      title: 'Translates'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TranslatesRoutingModule {}
