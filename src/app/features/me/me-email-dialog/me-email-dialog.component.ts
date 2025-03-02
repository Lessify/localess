import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-me-email-dialog',
  standalone: true,
  templateUrl: './me-email-dialog.component.html',
  styleUrls: ['./me-email-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInput, MatButton],
})
export class MeEmailDialogComponent {
  form: FormGroup = this.fb.group({
    newEmail: this.fb.control('', [Validators.required, Validators.minLength(3)]),
  });

  constructor(private readonly fb: FormBuilder) {}
}
