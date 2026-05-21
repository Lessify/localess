import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

@Component({
  selector: 'll-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage, ReactiveFormsModule, RouterModule, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class ResetComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);

  redirect = ['/login'];

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(3), Validators.email]),
  });

  async passwordReset(): Promise<void> {
    await sendPasswordResetEmail(this.auth, this.form.value.email);
    this.form.reset();
    await this.router.navigate(this.redirect);
  }
}
