import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { isFormDirtyGuard } from '@shared/guards/dirty-form.guard';
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
    canDeactivate: [isFormDirtyGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContentsRoutingModule {}
