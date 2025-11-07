import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';
import { TranslationsComponent } from './translations.component';

const routes: Routes = [
  {
    path: '',
    component: TranslationsComponent,
    data: {
      breadcrumb: {
        label: 'Translations',
        route: '',
      } satisfies BreadcrumbItem,
    },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TranslationsRoutingModule {}
