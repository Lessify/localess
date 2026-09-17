import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { MePasswordDialogResult } from './me-password-dialog.model';

@Component({
  selector: 'll-me-password-dialog',
  templateUrl: './me-password-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [ReactiveFormsModule, HlmDialogImports, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class MePasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<MePasswordDialogResult>>(BrnDialogRef);

  /** No context: the dialog only ever sets a new password, never shows the current one. */
  form: FormGroup = this.fb.group({
    newPassword: this.fb.control('', [Validators.required, Validators.minLength(6)]),
  });

  save(): void {
    this.dialogRef.close(this.form.value as MePasswordDialogResult);
  }
}
