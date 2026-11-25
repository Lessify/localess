import { inject, Pipe, PipeTransform } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserStore } from '@core/stores/user.store';
import { hasRole, ROLE_LISTS, RoleListName } from '@localess/shared';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

/** Whether the user's role is in the named list (`'CONTENT_WRITERS' | hasRole | async`); no list given: yes. */
@Pipe({ name: 'hasRole' })
export class HasRolePipe implements PipeTransform {
  private readonly role$ = toObservable(inject(UserStore).role);

  transform(list?: RoleListName): Observable<boolean> {
    if (list === undefined) return of(true);
    return this.role$.pipe(map(role => hasRole({ role }, ROLE_LISTS[list])));
  }
}
