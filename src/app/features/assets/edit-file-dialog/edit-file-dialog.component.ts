import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EditFileDialogModel } from './edit-file-dialog.model';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { CommonValidator } from '@shared/validators/common.validator';
import { AssetValidator } from '@shared/validators/asset.validator';

@Component({
  selector: 'll-asset-edit-file-dialog',
  templateUrl: './edit-file-dialog.component.html',
  styleUrls: ['./edit-file-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFileDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...AssetValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: EditFileDialogModel
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.asset);
    }
  }
}
