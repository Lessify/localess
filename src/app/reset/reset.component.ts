import { Component, Optional } from '@angular/core';
import { Auth, sendPasswordResetEmail, User } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-reset',
  standalone: true,
  templateUrl: './reset.component.html',
  styleUrls: ['./reset.component.scss'],
  imports: [NgOptimizedImage, ReactiveFormsModule, MatFormFieldModule, MatInput, MatButton, RouterLink],
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
    private readonly fb: FormBuilder,
  ) {}

  async passwordReset(): Promise<void> {
    await sendPasswordResetEmail(this.auth, this.form.value.email);
    this.form.reset();
    await this.router.navigate(this.redirect);
  }
}
