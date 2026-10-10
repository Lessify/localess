import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MigrationComponent } from './migration/migration.component';
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
      {
        path: 'migration',
        component: MigrationComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {}
