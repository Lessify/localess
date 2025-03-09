import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { AssetValidator } from '@shared/validators/asset.validator';
import { CommonValidator } from '@shared/validators/common.validator';
import { AddFolderDialogModel } from './add-folder-dialog.model';

@Component({
  selector: 'll-asset-add-folder-dialog',
  standalone: true,
  templateUrl: './add-folder-dialog.component.html',
  styleUrls: ['./add-folder-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
})
export class AddFolderDialogComponent {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...AssetValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: AddFolderDialogModel,
  ) {}
}
