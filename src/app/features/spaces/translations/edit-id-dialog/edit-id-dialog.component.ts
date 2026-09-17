import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { TranslationValidator } from '@shared/validators/translation.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { EditIdDialogContext, EditIdDialogResult } from './edit-id-dialog.model';

@Component({
  selector: 'll-translation-edit-id-dialog',
  templateUrl: './edit-id-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmInputGroupImports],
})
export class EditIdDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EditIdDialogResult>>(BrnDialogRef);

  /** Required: the caller always passes the current id and the ids already taken. */
  private readonly context = injectBrnDialogContext<EditIdDialogContext>();

  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...TranslationValidator.ID, CommonValidator.reservedName(this.context.reservedIds)]),
  });

  ngOnInit(): void {
    this.form.patchValue({ id: this.context.id });
  }

  save(): void {
    this.dialogRef.close(this.form.value.id as EditIdDialogResult);
  }
}
