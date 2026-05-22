import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { RandomBackgroundComponent } from '@shared/components/background/random';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'll-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucideMoon, lucideSun })],
  imports: [
    NgOptimizedImage,
    ReactiveFormsModule,
    RouterModule,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmInputImports,
    HlmTooltipImports,
    RandomBackgroundComponent,
  ],
})
export class ResetComponent {
  readonly settingsStore = inject(LocalSettingsStore);

  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);

  redirect = ['/login'];

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(3), Validators.email]),
  });

  switchTheme(): void {
    this.settingsStore.setTheme(this.settingsStore.theme() === 'dark' ? 'light' : 'dark');
  }

  async passwordReset(): Promise<void> {
    await sendPasswordResetEmail(this.auth, this.form.value.email);
    this.form.reset();
    await this.router.navigate(this.redirect);
  }
}
