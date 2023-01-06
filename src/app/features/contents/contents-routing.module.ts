import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ContentsComponent} from './contents.component';
import {PageDataEditComponent} from './page-data-edit/page-data-edit.component';

const routes: Routes = [
  {
    path: '',
    component: ContentsComponent
  },
  {
    path: ':contentId',
    component: PageDataEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ContentsRoutingModule {}
