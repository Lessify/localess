import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, signal } from '@angular/core';
import { Auth, signInWithCustomToken } from '@angular/fire/auth';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '@shared/services/notification.service';
import { UserStore } from '@shared/stores/user.store';
import { SetupService } from './setup.service';

@Component({
  selector: 'll-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SetupService],
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterModule, NgOptimizedImage],
})
export class SetupComponent {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly setupService = inject(SetupService);
  private readonly notificationService = inject(NotificationService);
  private readonly cd = inject(ChangeDetectorRef);

  redirectToFeatures = ['features', 'welcome'];
  backCounter = signal(-1);

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control(undefined),
  });

  userStore = inject(UserStore);

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
      next: async token => {
        //this.backTimer();
        this.notificationService.success('Setup has been finished, you will be redirected in few seconds.');
        await signInWithCustomToken(this.auth, token);
        this.userStore.setAuthenticated(true);
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
