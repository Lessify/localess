import { ChangeDetectionStrategy, Component, effect, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AddDialogModel } from './add-dialog.model';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaType, schemaTypeDescriptions } from '@shared/models/schema.model';
import { NameUtils } from '@core/utils/name-utils.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'll-schema-add-dialog',
  templateUrl: './add-dialog.component.html',
  styleUrls: ['./add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddDialogComponent {
  schemaTypeDescriptions = schemaTypeDescriptions;
  types: string[] = Object.keys(SchemaType);

  form: FormGroup = this.fb.group({
    displayName: this.fb.control<string | undefined>(undefined, SchemaValidator.DISPLAY_NAME),
    id: this.fb.control<string | undefined>('', [...SchemaValidator.ID, CommonValidator.reservedName(this.data.reservedIds)]),
    type: this.fb.control<SchemaType>(SchemaType.NODE, SchemaValidator.TYPE),
  });

  formDisplayNameValue = toSignal(this.form.controls['displayName'].valueChanges);

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: AddDialogModel,
  ) {
    effect(() => {
      if (!this.form.controls['id'].touched) {
        this.form.controls['id'].setValue(NameUtils.schemaId(this.formDisplayNameValue() || ''));
      }
    });
  }

  get type(): SchemaType {
    return this.form.controls['type'].value;
  }

  normalizeId() {
    if (this.form.value.slug) {
      this.form.controls['id'].setValue(NameUtils.schemaId(this.form.value.id));
    }
  }
}
