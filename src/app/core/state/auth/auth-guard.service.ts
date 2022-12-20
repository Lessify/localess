import {Injectable, Optional} from '@angular/core';
import {CanActivate, Router, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {Auth, authState} from '@angular/fire/auth';
import {map} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {AppState} from '../core.state';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService implements CanActivate {
  constructor(private store: Store<AppState>, @Optional() private auth: Auth, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      // tap((it) => console.log(it)),
      map((u) => !!u),
      map((it) => {
        if (it) {
          return it;
        } else {
          return this.router.createUrlTree(['/login']);
        }
      })
    );
    /* return authState(this.auth).pipe(
      tap(it => console.log(it)),
      map((u) => !!u),
      map((it) => {
        if (it) {
          return it;
        } else {
          return this.router.createUrlTree(['/login']);
        }
      })
    );*/
  }
}
