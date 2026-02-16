import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GeneralComponent } from './general/general.component';
import { LocalesComponent } from './locales/locales.component';
import { SettingsComponent } from './settings.component';
import { TokensComponent } from './tokens/tokens.component';
import { VisualEditorComponent } from './visual-editor/visual-editor.component';
import { WebhooksComponent } from './webhooks/webhooks.component';
import { DangerZoneComponent } from './danger-zone/danger-zone.component';

const routes: Routes = [
  { path: '', redirectTo: 'general', pathMatch: 'full' },
  {
    path: '',
    component: SettingsComponent,
    children: [
      {
        path: 'general',
        component: GeneralComponent,
      },
      {
        path: 'locales',
        component: LocalesComponent,
      },
      {
        path: 'visual-editor',
        component: VisualEditorComponent,
      },
      {
        path: 'tokens',
        component: TokensComponent,
      },
      {
        path: 'webhooks',
        component: WebhooksComponent,
      },
      {
        path: 'danger-zone',
        component: DangerZoneComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
