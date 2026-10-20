import { inject, Pipe, PipeTransform } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserStore } from '@core/stores/user.store';
import { canAny } from '@core/utils/permissions';
import { UserPermission } from '@localess/shared';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Whether the user may do the permission, or any of several, by the server's rule (`canAny`); none given: yes. */
@Pipe({
  name: 'canUserPerform',
  standalone: true,
})
export class CanUserPerformPipe implements PipeTransform {
  userStore = inject(UserStore);
  role$ = toObservable(this.userStore.role);

  transform(permission?: string | string[]): Observable<boolean> {
    if (permission === undefined) return of(true);
    const permissions = (Array.isArray(permission) ? permission : [permission]) as UserPermission[];
    return this.role$.pipe(map(() => canAny(this.userStore, ...permissions)));
  }
}
