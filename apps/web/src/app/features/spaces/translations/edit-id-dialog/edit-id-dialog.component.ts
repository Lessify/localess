import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { TranslationValidator } from '../shared/translation.validator';
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
    key: this.fb.control('', [...TranslationValidator.ID, CommonValidator.reservedName(this.context.reservedKeys)]),
  });

  ngOnInit(): void {
    this.form.patchValue({ key: this.context.key });
  }

  save(): void {
    this.dialogRef.close(this.form.value.key as EditIdDialogResult);
  }
}
