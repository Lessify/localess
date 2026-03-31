import { inject, NgModule } from '@angular/core';
import { ResolveFn, RouterModule, Routes } from '@angular/router';
import { isFormDirtyGuard } from '@shared/guards/dirty-form.guard';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';
import { ContentDocument } from '@shared/models/content.model';
import { ContentService } from '@shared/services/content.service';
import { tap } from 'rxjs/operators';

import { ContentsComponent } from './contents.component';
import { EditDocumentComponent } from './edit-document/edit-document.component';

const documentResolver: ResolveFn<ContentDocument> = route => {
  const { spaceId, contentId } = route.params;
  return inject(ContentService).findDocumentById(spaceId, contentId).pipe(tap(console.log));
};

const routes: Routes = [
  {
    path: '',
    component: ContentsComponent,
  },
  {
    path: ':contentId',
    component: EditDocumentComponent,
    canDeactivate: [isFormDirtyGuard],
    data: {
      breadcrumb: {
        label: 'Details',
      } satisfies BreadcrumbItem,
    },
    resolve: {
      document: documentResolver,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContentsRoutingModule {}
