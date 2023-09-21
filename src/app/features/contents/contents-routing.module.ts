import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentsComponent } from './contents.component';
import { EditDocumentComponent } from './edit-document/edit-document.component';

const routes: Routes = [
  {
    path: '',
    component: ContentsComponent,
  },
  {
    path: ':contentId',
    component: EditDocumentComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContentsRoutingModule {}
