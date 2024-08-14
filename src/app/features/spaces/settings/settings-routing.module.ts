import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { LocalesComponent } from './locales/locales.component';
import { GeneralComponent } from './general/general.component';
import { VisualEditorComponent } from './visual-editor/visual-editor.component';
import { TokensComponent } from './tokens/tokens.component';

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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
