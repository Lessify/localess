import { inject, Pipe, PipeTransform } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserStore } from '@shared/store/user.store';
import { toObservable } from '@angular/core/rxjs-interop';

@Pipe({ name: 'canUserPerform' })
export class CanUserPerformPipe implements PipeTransform {
  userStore = inject(UserStore);
  role$ = toObservable(this.userStore.role);

  transform(permission?: string | string[]): Observable<boolean> {
    // console.log('canUserPerform : ' + permission);
    if (permission === undefined) return of(true);
    if (typeof permission === 'string') {
      return this.role$.pipe(
        map(role => {
          if (role) {
            if (role === 'admin') return true;
            const userPermissions = this.userStore.permissions();
            if (role === 'custom' && userPermissions) {
              return userPermissions.includes(permission);
            }
          }
          return false;
        }),
      );
    }
    if (Array.isArray(permission)) {
      return this.role$.pipe(
        map(role => {
          if (role) {
            if (role === 'admin') return true;
            const userPermissions = this.userStore.permissions();
            if (role === 'custom' && userPermissions) {
              return permission.some(it => userPermissions.includes(it));
            }
          }
          return false;
        }),
      );
    }
    return of(false);
  }
}
