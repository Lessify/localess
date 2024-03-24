import { Component, DestroyRef, effect, inject, Optional } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  IdTokenResult,
  OAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserStore } from '@shared/store/user.store';
import { SettingsStore } from '@shared/store/settings.store';

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  redirect = ['/features'];
  isLoading = false;

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.minLength(2)]),
    password: this.fb.control('', [Validators.minLength(2)]),
  });

  //Login
  isGoogleAuthEnabled: boolean = environment.auth.providers.includes('GOOGLE');
  isMicrosoftAuthEnabled: boolean = environment.auth.providers.includes('MICROSOFT');

  public readonly user: Observable<User | null> = EMPTY;
  parsedToken?: Promise<IdTokenResult>;
  // Subscriptions
  private readonly userDisposable: Subscription | undefined;

  private destroyRef = inject(DestroyRef);
  userStore = inject(UserStore);
  settingsStore = inject(SettingsStore);

  constructor(
    @Optional() public readonly auth: Auth,
    private readonly router: Router,
    private readonly fb: FormBuilder
  ) {
    effect(
      () => {
        console.log('Login User Authenticated Effect :', this.userStore.isAuthenticated());
        if (this.userStore.isAuthenticated()) {
          this.router.navigate(['/features']);
        }
      },
      { allowSignalWrites: true }
    );
  }

  async loginWithEmailAndPassword(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
    this.userStore.setAuthenticated(true);
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    if (environment.auth.customDomain) {
      provider.setCustomParameters({
        hd: environment.auth.customDomain,
      });
    }
    await signInWithPopup(this.auth, provider);
    this.userStore.setAuthenticated(true);
  }

  async loginWithMicrosoft(): Promise<void> {
    const provider = new OAuthProvider('microsoft.com');
    if (environment.auth.customDomain) {
      provider.setCustomParameters({
        tenant: environment.auth.customDomain,
      });
    }
    await signInWithPopup(this.auth, provider);
    this.userStore.setAuthenticated(true);
  }

  async logout(): Promise<void> {
    this.userStore.setAuthenticated(false);
    return await signOut(this.auth);
  }
}
