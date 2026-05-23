import { AsyncPipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { UserStore } from '@shared/stores/user.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { EMPTY, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, JsonPipe, ReactiveFormsModule, RouterModule, HlmButtonImports, HlmFieldImports, HlmInputImports],
})
export class LoginComponent {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);

  redirectToFeatures = ['features'];
  hasAuthError = signal(false);

  form = this.fb.group({
    email: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    password: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
  });

  isGoogleAuthEnabled: boolean = environment.auth.providers.includes('GOOGLE');
  isMicrosoftAuthEnabled: boolean = environment.auth.providers.includes('MICROSOFT');
  message: string = environment.login.message;

  public readonly user: Observable<User | null> = EMPTY;
  parsedToken?: Promise<IdTokenResult>;

  userStore = inject(UserStore);
  readonly settingsStore = inject(LocalSettingsStore);

  constructor() {
    effect(async () => {
      console.log('Login User Authenticated Effect :', this.userStore.isAuthenticated());
      if (this.userStore.isAuthenticated()) {
        await this.router.navigate(this.redirectToFeatures);
        window.location.reload();
      }
    });
  }

  async loginWithEmailAndPassword(): Promise<void> {
    const { email, password } = this.form.value;
    if (!email || !password) return;
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      this.userStore.setAuthenticated(true);
    } catch (error) {
      console.error(error);
      if (error && typeof error === 'object' && 'code' in error && error.code) {
        this.hasAuthError.set(true);
      }
    }
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
