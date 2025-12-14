import { inject, NgModule } from '@angular/core';
import { ResolveFn, RouterModule, Routes } from '@angular/router';
import { isFormDirtyGuard } from '@shared/guards/dirty-form.guard';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';
import { ContentDocument } from '@shared/models/content.model';
import { Schema } from '@shared/models/schema.model';
import { ContentService } from '@shared/services/content.service';
import { SchemaService } from '@shared/services/schema.service';
import { tap } from 'rxjs/operators';
import { ContentsComponent } from './contents.component';
import { EditDocumentComponent } from './edit-document/edit-document.component';

const documentResolver: ResolveFn<ContentDocument> = route => {
  return inject(ContentService).findDocumentById(route.paramMap.get('spaceId')!, route.paramMap.get('contentId')!);
};

const documentsResolver: ResolveFn<ContentDocument[]> = route => {
  return inject(ContentService).findAllDocuments(route.paramMap.get('spaceId')!).pipe(tap(console.log));
};

const schemasResolver: ResolveFn<Schema[]> = route => {
  return inject(SchemaService).findAll(route.paramMap.get('spaceId')!);
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
      documents: documentsResolver,
      schemas: schemasResolver,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContentsRoutingModule {}
