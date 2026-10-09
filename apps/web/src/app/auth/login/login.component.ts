import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AppConfigService } from '@core/api/app-config.service';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AuthApiService, OAuthProvider } from '@core/services/auth-api.service';
import { LocalSettingsStore } from '@core/stores/local-settings.store';
import { UserStore } from '@core/stores/user.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { map } from 'rxjs';

/** Messages for the `?error=` the OAuth callback redirects back with. */
const OAUTH_ERRORS: Record<string, string> = {
  'no-account': 'There is no Localess account for this login. Ask an administrator to invite you.',
  'email-not-verified': 'The provider did not confirm your email address.',
  'wrong-domain': 'This account is not allowed to sign in here.',
  disabled: 'This account is disabled.',
  failed: 'Signing in with the provider failed. Please try again.',
};

@Component({
  selector: 'll-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, HlmButtonImports, HlmFieldImports, HlmInputImports],
})
export class LoginComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);
  private readonly appConfig = inject(AppConfigService);
  readonly fe = inject(FormErrorHandlerService);
  readonly userStore = inject(UserStore);
  readonly settingsStore = inject(LocalSettingsStore);

  hasAuthError = signal(false);
  pending = signal(false);

  form = this.fb.group({
    email: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    password: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
  });

  readonly providers = computed(() => this.appConfig.config().auth.providers);
  readonly isGoogleAuthEnabled = computed(() => this.providers().includes('GOOGLE'));
  readonly isMicrosoftAuthEnabled = computed(() => this.providers().includes('MICROSOFT'));
  readonly message = computed(() => this.appConfig.config().auth.loginMessage);
  readonly oauthError = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map(params => (params.get('error') ? (OAUTH_ERRORS[params.get('error')!] ?? OAUTH_ERRORS['failed']) : undefined)),
    ),
  );

  loginWithEmailAndPassword(): void {
    const { email, password } = this.form.value;
    if (!email || !password) return;
    this.pending.set(true);
    this.hasAuthError.set(false);
    this.authApi.login(email, password).subscribe({
      next: user => {
        this.userStore.signedIn(user);
        // A full load, so every store starts from the new session.
        this.redirect('/features');
      },
      error: () => {
        this.pending.set(false);
        this.hasAuthError.set(true);
      },
    });
  }

  loginWith(provider: OAuthProvider): void {
    this.redirect(this.authApi.oauthUrl(provider));
  }

  /** Full-page navigation (OAuth is a redirect flow; sign-in reloads the app). Separate for tests. */
  redirect(url: string): void {
    window.location.assign(url);
  }
}
