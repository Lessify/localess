import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'll-me-email-dialog',
  templateUrl: './me-email-dialog.component.html',
  styleUrls: ['./me-email-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeEmailDialogComponent {
  form: FormGroup = this.fb.group({
    newEmail: this.fb.control('', [Validators.required, Validators.minLength(3)]),
  });

  constructor(private readonly fb: FormBuilder) {}
}
