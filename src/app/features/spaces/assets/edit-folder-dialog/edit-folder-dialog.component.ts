import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetValidator } from '@shared/validators/asset.validator';
import { CommonValidator } from '@shared/validators/common.validator';
import { EditFolderDialogModel } from './edit-folder-dialog.model';

@Component({
  selector: 'll-asset-edit-folder-dialog',
  standalone: true,
  templateUrl: './edit-folder-dialog.component.html',
  styleUrls: ['./edit-folder-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButtonModule],
})
export class EditFolderDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...AssetValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: EditFolderDialogModel,
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.asset);
    }
  }
}
