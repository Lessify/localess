import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { SpaceValidator } from '@shared/validators/space.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { SpaceEditDialogContext, SpaceEditDialogResult } from './space-edit-dialog.model';

/** Renaming an existing space. Templates apply to new spaces only, so there is no picker here. */
@Component({
  selector: 'll-space-edit-dialog',
  templateUrl: './space-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputGroupImports],
})
export class SpaceEditDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<SpaceEditDialogResult>>(BrnDialogRef);

  /** Optional so a dialog opened without a context still renders, with an empty name. */
  private readonly context = injectBrnDialogContext<SpaceEditDialogContext>({ optional: true });

  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME),
  });

  ngOnInit(): void {
    // `?.` because the injection above is optional - without it this throws when no context was passed.
    if (this.context != null) {
      this.form.patchValue({ name: this.context.name });
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as SpaceEditDialogResult);
  }
}
