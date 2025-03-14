import { inject } from '@angular/core';
import { Router, Routes, UrlTree } from '@angular/router';
import { UserStore } from '@shared/stores/user.store';
import { Observable } from 'rxjs';

export function authGuard(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
  const userStore = inject(UserStore);
  const router = inject(Router);
  if (userStore.isAuthenticated()) {
    return true;
  } else {
    return router.createUrlTree(['/login']);
  }
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'features',
    pathMatch: 'full',
  },
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'reset',
    title: 'Forgot Password',
    loadComponent: () => import('./reset/reset.component').then(m => m.ResetComponent),
  },
  {
    path: 'setup',
    title: 'Initial Setup',
    loadComponent: () => import('./setup/setup.component').then(m => m.SetupComponent),
  },
  {
    path: 'features',
    loadChildren: () => import('./features/features.module').then(m => m.FeaturesModule),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'features',
  },
];
