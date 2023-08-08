import {Component, OnDestroy, Optional} from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  IdTokenResult,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
  UserCredential
} from '@angular/fire/auth';
import {Router} from '@angular/router';
import {EMPTY, Observable, Subscription} from 'rxjs';
import {traceUntilFirst} from '@angular/fire/performance';
import {map, tap} from 'rxjs/operators';
import {Store} from '@ngrx/store';
import {AppState} from '@core/state/core.state';
import {authLogin, authLogout} from '@core/core.module';
import {environment} from '../../environments/environment';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {selectSettings} from "@core/state/settings/settings.selectors";

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {
  redirect = ['/features'];
  isLoading: boolean = false;

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.minLength(2)]),
    password: this.fb.control('', [Validators.minLength(2)]),
  });

  //Login
  isGoogleAuthEnabled: boolean = environment.auth.providers.includes('GOOGLE');
  isMicrosoftAuthEnabled: boolean = environment.auth.providers.includes('MICROSOFT');

  showLoginButton = false;
  showLogoutButton = false;
  public readonly user: Observable<User | null> = EMPTY;
  parsedToken?: Promise<IdTokenResult>;
  // Subscriptions
  settings$ = this.store.select(selectSettings);
  private readonly userDisposable: Subscription | undefined;

  constructor(
    private readonly store: Store<AppState>,
    @Optional() public readonly auth: Auth,
    private readonly router: Router,
    private readonly fb: FormBuilder
  ) {
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

  async loginWithEmailAndPassword(email: string, password: string): Promise<void> {
    const uc: UserCredential = await signInWithEmailAndPassword(this.auth, email, password);
    this.store.dispatch(authLogin());
    await this.router.navigate(this.redirect);
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    if (environment.auth.customDomain) {
      provider.setCustomParameters({
        hd: environment.auth.customDomain
      });
    }
    const uc: UserCredential = await signInWithPopup(this.auth, provider);
    this.store.dispatch(authLogin());
    await this.router.navigate(this.redirect);
  }

  async loginWithMicrosoft(): Promise<void> {
    const provider = new OAuthProvider('microsoft.com');
    if (environment.auth.customDomain) {
      provider.setCustomParameters({
        tenant: environment.auth.customDomain
      });
    }
    const uc: UserCredential = await signInWithPopup(this.auth, provider);
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
