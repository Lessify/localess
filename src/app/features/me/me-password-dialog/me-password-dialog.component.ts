import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'll-me-password-dialog',
  templateUrl: './me-password-dialog.component.html',
  styleUrls: ['./me-password-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MePasswordDialogComponent {
  form: FormGroup = this.fb.group({
    newPassword: this.fb.control('', [Validators.required, Validators.minLength(6)]),
  });

  constructor(private readonly fb: FormBuilder) {}
}
