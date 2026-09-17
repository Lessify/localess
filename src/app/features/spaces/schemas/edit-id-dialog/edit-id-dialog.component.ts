import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NameUtils } from '@core/utils/name-utils.service';
import { provideIcons } from '@ng-icons/core';
import { lucideWand2 } from '@ng-icons/lucide';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';

import { EditIdDialogContext, EditIdDialogResult } from './edit-id-dialog.model';

@Component({
  selector: 'll-schema-edit-id-dialog',
  templateUrl: './edit-id-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmInputGroupImports],
  providers: [provideIcons({ lucideWand2 })],
})
export class EditIdDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  private readonly dialogRef = inject<BrnDialogRef<EditIdDialogResult>>(BrnDialogRef);

  /** Required: the caller always passes the current id and the ids already taken. */
  private readonly context = injectBrnDialogContext<EditIdDialogContext>();

  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...SchemaValidator.ID, CommonValidator.reservedName(this.context.reservedIds)]),
  });

  ngOnInit(): void {
    this.form.patchValue({ id: this.context.id });
  }

  normalizeId() {
    if (this.form.value.slug) {
      this.form.controls['id'].setValue(NameUtils.schemaId(this.form.value.id));
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value.id as EditIdDialogResult);
  }
}
