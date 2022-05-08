import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  signOut,
  User
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '../core/state/core.state';
import { authLogin, authLogout } from '../core/core.module';
import firebase from 'firebase/compat';
import IdTokenResult = firebase.auth.IdTokenResult;

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styles: []
})
export class LoginComponent implements OnInit, OnDestroy {
  redirect = ['/f'];

  showLoginButton = false;
  showLogoutButton = false;
  public readonly user: Observable<User | null> = EMPTY;
  private readonly userDisposable: Subscription | undefined;
  parsedToken?: Promise<IdTokenResult>;

  constructor(private store: Store<AppState>, @Optional() private auth: Auth, private router: Router) {
    if (auth) {
      this.user = authState(this.auth);
      this.userDisposable = authState(this.auth)
        .pipe(
          traceUntilFirst('auth'),
          tap((u) => {
            this.parsedToken = u?.getIdTokenResult();
          }),
          map((u) => !!u)
        )
        .subscribe((isLoggedIn) => {
          this.showLoginButton = !isLoggedIn;
          this.showLogoutButton = isLoggedIn;
        });
    }
  }

  ngOnInit(): void {}

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
    this.store.dispatch(authLogin());
    await this.router.navigate(this.redirect);
  }

  async loginAnonymously() {
    await signInAnonymously(this.auth);
    await this.router.navigate(this.redirect);
  }

  async logout(): Promise<void> {
    this.store.dispatch(authLogout());
    return await signOut(this.auth);
  }

  ngOnDestroy(): void {
    if (this.userDisposable) {
      this.userDisposable.unsubscribe();
    }
  }
}
