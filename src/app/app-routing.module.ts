import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AuthGuardService} from './core/core.module';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'f',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginModule)
  },
  {
    path: 'f',
    loadChildren: () => import('./features/features.module').then((m) => m.FeaturesModule),
    canActivate: [AuthGuardService]
  },
  {
    path: '**',
    redirectTo: 'f'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
