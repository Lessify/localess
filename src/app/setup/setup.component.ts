import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SetupService } from './setup.service';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'll-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
})
export class SetupComponent {
  redirect = ['/features'];
  isLoading: boolean = false;
  backCounter = -1;

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(6)]),
    displayName: this.fb.control(undefined),
  });

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly setupService: SetupService,
    private readonly notificationService: NotificationService,
    private readonly cd: ChangeDetectorRef
  ) {}

  setup(): void {
    this.setupService.init(this.form.value).subscribe({
      next: () => {
        this.backTimer();
        this.notificationService.success('Setup has been finished, you will be redirected in 5 seconds.');
      },
      error: () => {
        this.backTimer();
        this.notificationService.error('Setup can not be finished, you will be redirected in 5 seconds.');
      },
    });
  }

  backTimer(): void {
    this.backCounter = 5;
    const timer = setInterval(() => {
      this.cd.markForCheck();
      this.backCounter--;
      if (this.backCounter === -1) {
        clearInterval(timer);
        this.router.navigate(this.redirect);
      }
    }, 1000);
  }
}
