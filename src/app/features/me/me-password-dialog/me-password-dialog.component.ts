import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-me-password-dialog',
  standalone: true,
  templateUrl: './me-password-dialog.component.html',
  styleUrls: ['./me-password-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatDialogActions,
    MatButton,
    MatDialogClose,
  ],
})
export class MePasswordDialogComponent {
  form: FormGroup = this.fb.group({
    newPassword: this.fb.control('', [Validators.required, Validators.minLength(6)]),
  });

  constructor(private readonly fb: FormBuilder) {}
}
