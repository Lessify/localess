import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'll-me-email-dialog',
  templateUrl: './me-email-dialog.component.html',
  styleUrls: ['./me-email-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class MeEmailDialogComponent {
  form: FormGroup = this.fb.group({
    newEmail: this.fb.control('', [Validators.required, Validators.minLength(3)]),
  });

  constructor(private readonly fb: FormBuilder) {}
}
