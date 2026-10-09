import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';

import { MeComponent } from './me.component';

const routes: Routes = [
  {
    path: '',
    component: MeComponent,
    data: {
      breadcrumb: {
        label: 'Me',
        route: '',
      } satisfies BreadcrumbItem,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MeRoutingModule {}
