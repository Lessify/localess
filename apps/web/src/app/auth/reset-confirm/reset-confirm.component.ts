import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AuthApiService } from '@core/services/auth-api.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

const sameAsPassword = (control: AbstractControl): ValidationErrors | null =>
  control.parent && control.value !== control.parent.get('password')?.value ? { mismatch: true } : null;

/** Target of password reset links: `/auth/reset/confirm?token=…`. */
@Component({
  selector: 'll-reset-confirm',
  templateUrl: './reset-confirm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterModule, HlmButtonImports, HlmFieldImports, HlmInputImports],
})
export class ResetConfirmComponent {
  private readonly authApi = inject(AuthApiService);
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);

  /** From the `token` query parameter (component input binding). */
  readonly token = input<string>();
  readonly done = signal(false);
  readonly error = signal<string | undefined>(undefined);

  form = this.fb.group({
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    confirm: this.fb.control('', [Validators.required, sameAsPassword]),
  });

  submit(): void {
    const token = this.token();
    const { password } = this.form.value;
    if (!token || !password) return;
    this.error.set(undefined);
    this.authApi.confirmPasswordReset(token, password).subscribe({
      next: () => this.done.set(true),
      error: (error: HttpErrorResponse) =>
        this.error.set(
          error.status === 400 ? 'This reset link is invalid or has expired. Request a new one.' : 'The password could not be changed.',
        ),
    });
  }
}
