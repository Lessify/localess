import {Pipe, PipeTransform} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {AppState} from '../../core/state/core.state';
import {selectUser} from '../../core/state/user/user.selector';
import {UserPermission} from '@shared/models/user.model';

@Pipe({name: 'canUserPerform'})
export class CanUserPerformPipe implements PipeTransform {
  constructor(private readonly store: Store<AppState>) {
  }

  transform(permission: string): Observable<boolean> {
    // console.log('canUserPerform : ' + permission)
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
}
