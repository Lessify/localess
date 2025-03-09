import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'll-me-password-dialog',
  standalone: true,
  templateUrl: './me-password-dialog.component.html',
  styleUrls: ['./me-password-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class MePasswordDialogComponent {
  form: FormGroup = this.fb.group({
    newPassword: this.fb.control('', [Validators.required, Validators.minLength(6)]),
  });

  constructor(private readonly fb: FormBuilder) {}
}
