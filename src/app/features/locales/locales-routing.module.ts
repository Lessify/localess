import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {LocalesComponent} from './locales.component';

const routes: Routes = [
  {
    path: '',
    component: LocalesComponent,
    data: {
      title: 'Locales'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LocalesRoutingModule {}
