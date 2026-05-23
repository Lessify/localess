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
    return router.createUrlTree(['auth', 'login']);
  }
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'features',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule),
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
