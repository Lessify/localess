import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputImports } from '@spartan-ng/helm/input';

import { MeEmailDialogResult } from './me-email-dialog.model';

@Component({
  selector: 'll-me-email-dialog',
  templateUrl: './me-email-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [ReactiveFormsModule, HlmDialogImports, HlmFieldImports, HlmInputImports, HlmButtonImports],
})
export class MeEmailDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<MeEmailDialogResult>>(BrnDialogRef);

  /** No context: the dialog asks for a new address rather than editing the current one. */
  form: FormGroup = this.fb.group({
    newEmail: this.fb.control('', [Validators.required, Validators.minLength(3)]),
  });

  save(): void {
    this.dialogRef.close(this.form.value as MeEmailDialogResult);
  }
}
