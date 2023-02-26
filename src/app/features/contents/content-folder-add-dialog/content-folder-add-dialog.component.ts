import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ContentFolderAddDialogModel} from './content-folder-add-dialog.model';
import {ContentValidator} from '@shared/validators/content.validator';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {CommonValidator} from '@shared/validators/common.validator';

@Component({
  selector: 'll-content-folder-add-dialog',
  templateUrl: './content-folder-add-dialog.component.html',
  styleUrls: ['./content-folder-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentFolderAddDialogComponent {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...ContentValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
    slug: this.fb.control('', [...ContentValidator.SLUG, CommonValidator.reservedName(this.data.reservedSlugs)]),
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: ContentFolderAddDialogModel
  ) {
  }
}
