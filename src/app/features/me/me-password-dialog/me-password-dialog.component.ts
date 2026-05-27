import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

@Component({
  selector: 'll-me-password-dialog',
  templateUrl: './me-password-dialog.component.html',
  styleUrls: ['./me-password-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class MePasswordDialogComponent {
  private readonly fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    newPassword: this.fb.control('', [Validators.required, Validators.minLength(6)]),
  });
}
