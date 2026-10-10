import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { filter, map, take } from 'rxjs';

/**
 * Keeps signed-in users off the login page (a bookmark, Back after signing in, a second tab) and sends them into the
 * app, as the Firebase version did. Waits for the session check: the stored "signed in" flag can be stale.
 */
export const guestGuard: CanActivateFn = () => {
  const userStore = inject(UserStore);
  const router = inject(Router);
  return userStore.loaded$.pipe(
    filter(Boolean),
    take(1),
    map(() => (userStore.isAuthenticated() ? router.createUrlTree(['/features']) : true)),
  );
};
