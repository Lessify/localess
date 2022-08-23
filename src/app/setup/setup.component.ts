import {Component, OnDestroy} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SetupService} from './setup.service';
import {NotificationService} from '../core/notifications/notification.service';

@Component({
  selector: 'll-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss']
})
export class SetupComponent {
  redirect = ['/features'];
  isLoading: boolean = false;

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.minLength(2), Validators.email]),
    password: this.fb.control('', [Validators.minLength(6)]),
    displayName: this.fb.control(undefined),
  });

  constructor(
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly setupService: SetupService,
    private readonly notificationService: NotificationService,
  ) {
  }

  setup(): void {
    this.setupService.init(this.form.value)
      .subscribe({
        next: (response) => {
          this.notificationService.success('Setup has been finished.');
          this.router.navigate(this.redirect);
        },
        error: err => {
          console.error(err)
          this.notificationService.error('Setup can not be finished.');
          this.router.navigate(this.redirect);
        }
      })
  }
}
