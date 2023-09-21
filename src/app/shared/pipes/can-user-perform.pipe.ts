import { Pipe, PipeTransform } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '@core/state/core.state';
import { selectUser } from '@core/state/user/user.selector';

@Pipe({ name: 'canUserPerform' })
export class CanUserPerformPipe implements PipeTransform {
  constructor(private readonly store: Store<AppState>) {}

  transform(permission: string | string[]): Observable<boolean> {
    // console.log('canUserPerform : ' + permission)
    if (typeof permission === 'string') {
      return this.store.select(selectUser).pipe(
        map(user => {
          if (user.role) {
            if (user.role === 'admin') return true;
            if (user.role === 'custom' && user.permissions) {
              return user.permissions.includes(permission);
            }
          }
          return false;
        })
      );
    }
    if (Array.isArray(permission)) {
      return this.store.select(selectUser).pipe(
        map(user => {
          if (user.role) {
            if (user.role === 'admin') return true;
            if (user.role === 'custom' && user.permissions) {
              return permission.some(it => user.permissions?.includes(it));
            }
          }
          return false;
        })
      );
    }
    return of(false);
  }
}
