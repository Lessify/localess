import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GeneralComponent } from './general/general.component';
import { LocalesComponent } from './locales/locales.component';
import { SettingsComponent } from './settings.component';
import { TokensComponent } from './tokens/tokens.component';
import { VisualEditorComponent } from './visual-editor/visual-editor.component';

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
