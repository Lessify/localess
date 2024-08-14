import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { UiComponent } from './ui/ui.component';

const routes: Routes = [
  { path: '', redirectTo: 'ui', pathMatch: 'full' },
  {
    path: '',
    component: SettingsComponent,
    children: [
      {
        path: 'ui',
        component: UiComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
