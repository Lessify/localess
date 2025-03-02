import { Component, effect, inject, Optional } from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserStore } from '@shared/stores/user.store';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { AsyncPipe, JsonPipe, NgOptimizedImage } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [NgOptimizedImage, MatFormFieldModule, ReactiveFormsModule, MatInput, MatButton, RouterLink, AsyncPipe, JsonPipe],
})
export class LoginComponent {
  redirectToFeatures = ['features'];
  isLoading = false;

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.minLength(2)]),
    password: this.fb.control('', [Validators.minLength(2)]),
  });

  //Login
  isGoogleAuthEnabled: boolean = environment.auth.providers.includes('GOOGLE');
  isMicrosoftAuthEnabled: boolean = environment.auth.providers.includes('MICROSOFT');
  message: string = environment.login.message;

  public readonly user: Observable<User | null> = EMPTY;
  parsedToken?: Promise<IdTokenResult>;

  userStore = inject(UserStore);
  settingsStore = inject(LocalSettingsStore);

  constructor(
    @Optional() public readonly auth: Auth,
    private readonly router: Router,
    private readonly fb: FormBuilder,
  ) {
    effect(
      async () => {
        console.log('Login User Authenticated Effect :', this.userStore.isAuthenticated());
        if (this.userStore.isAuthenticated()) {
          await this.router.navigate(this.redirectToFeatures);
          window.location.reload();
        }
      },
      { allowSignalWrites: true },
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
