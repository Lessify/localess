import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { provideIcons } from '@ng-icons/core';
import { lucideMoon, lucideSun } from '@ng-icons/lucide';
import { BlueprintComponent } from '@shared/components/background';
import { NotificationService } from '@shared/services/notification.service';
import { LocalSettingsStore } from '@shared/stores/local-settings.store';
import { UserStore } from '@shared/stores/user.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

import { SetupService } from './setup.service';

@Component({
  selector: 'll-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SetupService, provideIcons({ lucideMoon, lucideSun })],
  imports: [
    ReactiveFormsModule,
    RouterModule,
    NgOptimizedImage,
    HlmButtonImports,
    HlmFieldImports,
    HlmIconImports,
    HlmInputImports,
    HlmTooltipImports,
    BlueprintComponent,
  ],
})
export class SetupComponent {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly setupService = inject(SetupService);
  private readonly notificationService = inject(NotificationService);
  private readonly cd = inject(ChangeDetectorRef);
  readonly fe = inject(FormErrorHandlerService);
  readonly userStore = inject(UserStore);
  readonly settingsStore = inject(LocalSettingsStore);

  switchTheme(): void {
    this.settingsStore.setTheme(this.settingsStore.theme() === 'dark' ? 'light' : 'dark');
  }

  redirectToFeatures = ['features', 'welcome'];
  backCounter = signal(-1);

  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control(undefined),
  });

  constructor() {
    effect(async () => {
      if (this.userStore.isAuthenticated()) {
        await this.router.navigate(this.redirectToFeatures);
        window.location.reload();
      }
    });
  }

  setup(): void {
    this.setupService.init(this.form.value).subscribe({
      next: () => {
        this.backToLoginTimer();
        this.notificationService.success('Setup has been finished, you will be redirected in few seconds.');
      },
      error: () => {
        this.backToLoginTimer();
        this.notificationService.error('Setup can not be finished, you will be redirected in few seconds.');
      },
    });
  }

  backToLoginTimer(): void {
    this.backCounter.set(5);
    const timer = setInterval(() => {
      this.backCounter.update(it => it - 1);
      this.cd.markForCheck();
      if (this.backCounter() === -1) {
        clearInterval(timer);
        this.router.navigate(this.redirectToFeatures);
      }
    }, 1000);
  }
}
