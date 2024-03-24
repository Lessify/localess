import { Component, Optional } from '@angular/core';
import { Auth, sendPasswordResetEmail, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'll-reset',
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
})
export class ResetComponent {
  redirect = ['/login'];

  //Form
  form: FormGroup = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.minLength(3), Validators.email]),
  });

  public readonly user: Observable<User | null> = EMPTY;

  constructor(
    @Optional() public readonly auth: Auth,
    private readonly router: Router,
    private readonly fb: FormBuilder
  ) {}

  async passwordReset(): Promise<void> {
    await sendPasswordResetEmail(this.auth, this.form.value.email);
    this.form.reset();
    await this.router.navigate(this.redirect);
  }
}
