import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FolderAddDialogModel} from './folder-add-dialog.model';
import {ContentValidator} from '@shared/validators/content.validator';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-folder-add-dialog',
  templateUrl: './folder-add-dialog.component.html',
  styleUrls: ['./folder-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderAddDialogComponent {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', ContentValidator.NAME),
    slug: this.fb.control('', ContentValidator.SLUG),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: FolderAddDialogModel
  ) {
  }
}
