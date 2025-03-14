import { ChangeDetectionStrategy, Component, effect, Inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { NameUtils } from '@core/utils/name-utils.service';
import { SchemaType, schemaTypeDescriptions } from '@shared/models/schema.model';
import { CommonValidator } from '@shared/validators/common.validator';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { AddDialogModel } from './add-dialog.model';

@Component({
  selector: 'll-schema-add-dialog',
  templateUrl: './add-dialog.component.html',
  styleUrls: ['./add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
  ],
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
