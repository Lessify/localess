import {Pipe, PipeTransform} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {AppState} from '../../core/state/core.state';
import {selectUserRole} from '../../core/state/user/user.selector';

@Pipe({name: 'hasAnyUserRole'})
export class HasAnyUserRolePipe implements PipeTransform {
  constructor(private readonly store: Store<AppState>) {
  }

  transform(roles: string[]): Observable<boolean> {
    return this.store.select(selectUserRole).pipe(
      map(role => {
        if (role && roles) {
          return roles.includes(role);
        } else {
          return false;
        }
      })
    );
  }
}
