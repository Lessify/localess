import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetValidator } from '@shared/validators/asset.validator';
import { CommonValidator } from '@shared/validators/common.validator';
import { EditFileDialogModel } from './edit-file-dialog.model';

@Component({
  selector: 'll-asset-edit-file-dialog',
  templateUrl: './edit-file-dialog.component.html',
  styleUrls: ['./edit-file-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class EditFileDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly fe = inject(FormErrorHandlerService);
  data = inject<EditFileDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...AssetValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.asset);
    }
  }
}
