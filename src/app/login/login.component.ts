import { Component, OnDestroy, Optional } from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
  IdTokenResult, UserCredential, OAuthProvider
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { traceUntilFirst } from '@angular/fire/performance';
import { map, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { AppState } from '../core/state/core.state';
import { authLogin, authLogout } from '../core/core.module';
import {environment} from '../../environments/environment';

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styles: []
})
export class LoginComponent implements OnDestroy {
  redirect = ['/features'];

  showLoginButton = false;
  showLogoutButton = false;
  isTesting: boolean = environment.test
  public readonly user: Observable<User | null> = EMPTY;
  private readonly userDisposable: Subscription | undefined;
  parsedToken?: Promise<IdTokenResult>;

  constructor(private store: Store<AppState>, @Optional() private auth: Auth, private router: Router) {
    if (this.auth) {
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

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    if(environment.auth.customDomain) {
      provider.setCustomParameters({
        hd: environment.auth.customDomain
      });
    }
    const uc: UserCredential = await signInWithPopup(this.auth, provider);
    console.log(uc)
    this.store.dispatch(authLogin());
    await this.router.navigate(this.redirect);
  }

  async loginWithMicrosoft(): Promise<void> {
    const provider = new OAuthProvider('microsoft.com');
    if(environment.auth.customDomain) {
      provider.setCustomParameters({
        tenant: environment.auth.customDomain
      });
    }
    const uc: UserCredential = await signInWithPopup(this.auth, provider);
    console.log(uc)
    this.store.dispatch(authLogin());
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
