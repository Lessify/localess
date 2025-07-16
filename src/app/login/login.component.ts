import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { UserStore } from '@shared/stores/user.store';
import { EMPTY, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButtonModule, RouterModule, NgOptimizedImage],
})
export class LoginComponent {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  redirectToFeatures = ['features'];

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

  constructor() {
    effect(async () => {
      console.log('Login User Authenticated Effect :', this.userStore.isAuthenticated());
      if (this.userStore.isAuthenticated()) {
        await this.router.navigate(this.redirectToFeatures);
        window.location.reload();
      }
    });
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
