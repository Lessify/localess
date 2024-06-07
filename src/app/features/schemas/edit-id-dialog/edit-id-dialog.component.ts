import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EditIdDialogModel } from './edit-id-dialog.model';
import { SchemaValidator } from '@shared/validators/schema.validator';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { NameUtils } from '@core/utils/name-utils.service';

@Component({
  selector: 'll-schema-edit-id-dialog',
  templateUrl: './edit-id-dialog.component.html',
  styleUrls: ['./edit-id-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditIdDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    id: this.fb.control('', [...SchemaValidator.ID, CommonValidator.reservedName(this.data.reservedIds)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: EditIdDialogModel
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue({ id: this.data.id });
    }
  }

  normalizeId() {
    if (this.form.value.slug) {
      this.form.controls['id'].setValue(NameUtils.schemaId(this.form.value.id));
    }
  }
}
