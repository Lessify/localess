import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { UserPermission } from '@localess/shared';
import { filter, map, take } from 'rxjs';

/**
 * Admins pass; custom users need at least one of `permissions`. Waits for the session check, so a
 * deep link opened in a new tab is decided on the real permissions, not the initial empty state.
 */
export function permissionGuard(...permissions: UserPermission[]): CanActivateFn {
  return () => {
    const userStore = inject(UserStore);
    const router = inject(Router);
    return toObservable(userStore.loaded).pipe(
      filter(Boolean),
      take(1),
      map(() => {
        const role = userStore.role();
        const granted = role === 'admin' || (role === 'custom' && permissions.some(it => userStore.permissions()?.includes(it)));
        return granted || router.createUrlTree(['features']);
      }),
    );
  };
}
