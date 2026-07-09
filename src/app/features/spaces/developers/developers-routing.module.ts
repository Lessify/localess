import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BreadcrumbItem } from '@shared/models/breadcrumb.model';

import { DevelopersComponent } from './developers.component';
import { OpenApiComponent } from './open-api/open-api.component';
import { WebhookDetailComponent } from './webhooks/webhook-detail/webhook-detail.component';
import { WebhooksComponent } from './webhooks/webhooks.component';

const routes: Routes = [
  { path: '', redirectTo: 'webhooks', pathMatch: 'full' },
  {
    path: '',
    component: DevelopersComponent,
    children: [
      {
        path: 'webhooks',
        data: {
          breadcrumb: {
            label: 'Webhooks',
          } satisfies BreadcrumbItem,
        },
        children: [
          {
            path: '',
            component: WebhooksComponent,
          },
          {
            path: ':webhookId',
            component: WebhookDetailComponent,
            data: {
              breadcrumb: {
                label: 'Details',
              } satisfies BreadcrumbItem,
            },
          },
        ],
      },
      {
        path: 'open-api',
        component: OpenApiComponent,
        data: {
          breadcrumb: {
            label: 'Open API',
          } satisfies BreadcrumbItem,
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DevelopersRoutingModule {}
