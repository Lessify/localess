import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PagesComponent} from './pages.component';
import {PageContentEditComponent} from './page-content-edit/page-content-edit.component';

const routes: Routes = [
  {
    path: '',
    component: PagesComponent
  },
  {
    path: ':id',
    component: PageContentEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule {}
