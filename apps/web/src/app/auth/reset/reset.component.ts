import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AppConfigService } from '@core/api/app-config.service';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AuthApiService } from '@core/services/auth-api.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

@Component({
  selector: 'll-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, HlmButtonImports, HlmFieldImports, HlmInputImports],
})
export class ResetComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);
  private readonly appConfig = inject(AppConfigService);
  readonly fe = inject(FormErrorHandlerService);
  /** Without SMTP the server can't email links; an administrator creates one instead. */
  readonly byEmail = computed(() => this.appConfig.config().auth.passwordResetByEmail);
  readonly sent = signal(false);

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(3), Validators.email]),
  });

  passwordReset(): void {
    this.authApi.requestPasswordReset(this.form.value.email).subscribe({
      next: () => {
        this.form.reset();
        this.sent.set(true);
      },
      error: () => this.sent.set(true),
    });
  }
}
