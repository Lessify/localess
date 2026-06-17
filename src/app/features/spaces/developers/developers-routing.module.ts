import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

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
        component: WebhooksComponent,
      },
      {
        path: 'webhooks/:webhookId',
        component: WebhookDetailComponent,
      },
      {
        path: 'open-api',
        component: OpenApiComponent,
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
