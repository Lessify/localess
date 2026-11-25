import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { hasRole, UserRole } from '@localess/shared';
import { filter, map, take } from 'rxjs';

/**
 * The user's role must be `roles`, or one of the list (`roles.ts` of @localess/shared, as the server's `@RequireRole`).
 * Waits for the session check, so a deep link opened in a new tab is decided on the real role, not the initial state.
 */
export function roleGuard(roles: UserRole | readonly UserRole[]): CanActivateFn {
  return () => {
    const userStore = inject(UserStore);
    const router = inject(Router);
    return toObservable(userStore.loaded).pipe(
      filter(Boolean),
      take(1),
      map(() => hasRole({ role: userStore.role() }, roles) || router.createUrlTree(['features'])),
    );
  };
}
