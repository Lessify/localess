import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

@Component({
  selector: 'll-me-email-dialog',
  templateUrl: './me-email-dialog.component.html',
  styleUrls: ['./me-email-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class MeEmailDialogComponent {
  private readonly fb = inject(FormBuilder);

  form: FormGroup = this.fb.group({
    newEmail: this.fb.control('', [Validators.required, Validators.minLength(3)]),
  });
}
