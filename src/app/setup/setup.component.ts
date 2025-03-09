import { ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '@shared/services/notification.service';
import { SetupService } from './setup.service';

@Component({
  selector: 'll-setup',
  standalone: true,
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, RouterModule],
})
export class SetupComponent {
  redirect = ['/features'];
  isLoading = false;
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
    private readonly cd: ChangeDetectorRef,
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
