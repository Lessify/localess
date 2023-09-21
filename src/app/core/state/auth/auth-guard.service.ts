import { inject, Injectable, Optional } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '../core.state';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  constructor(
    private store: Store<AppState>,
    @Optional() private auth: Auth,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      // tap((it) => console.log(it)),
      map(u => !!u),
      map(it => {
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

export function authGuard(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
  const auth = inject(Auth);
  const router = inject(Router);
  return authState(auth).pipe(
    map(u => !!u),
    map(it => {
      if (it) {
        return it;
      } else {
        return router.createUrlTree(['/login']);
      }
    })
  );
}
