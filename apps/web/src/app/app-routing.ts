import { inject } from '@angular/core';
import { Router, Routes, UrlTree } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { filter, map, Observable, take } from 'rxjs';

/**
 * Decides on the session check (`/api/auth/me`), not on the `isAuthenticated` flag cached in localStorage: without
 * the flag (a private window, cleared site data) a signed-in user's deep link went to the login page, which sent them
 * on to the welcome page instead.
 */
export function authGuard(): Observable<boolean | UrlTree> {
  const userStore = inject(UserStore);
  const router = inject(Router);
  return userStore.loaded$.pipe(
    filter(Boolean),
    take(1),
    map(() => userStore.isAuthenticated() || router.createUrlTree(['auth', 'login'])),
  );
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
    path: 'features',
    loadChildren: () => import('./features/features.module').then(m => m.FeaturesModule),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'features',
  },
];
