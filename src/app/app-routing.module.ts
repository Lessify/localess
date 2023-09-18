import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {authGuard} from '@core/state/auth/auth-guard.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'features',
    pathMatch: 'full'
  },
  {
    path: 'login',
    title: 'Login',
    loadChildren: () => import('./login/login.module').then((m) => m.LoginModule)
  },
  {
    path: 'reset',
    title: 'Forgot Password',
    loadChildren: () => import('./reset/reset.module').then((m) => m.ResetModule)
  },
  {
    path: 'setup',
    title: 'Initial Setup',
    loadChildren: () => import('./setup/setup.module').then((m) => m.SetupModule),
  },
  {
    path: 'features',
    loadChildren: () => import('./features/features.module').then((m) => m.FeaturesModule),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'features'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
