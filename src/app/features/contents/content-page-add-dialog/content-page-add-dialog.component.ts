import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ContentPageAddDialogModel} from './content-page-add-dialog.model';
import {ContentValidator} from '@shared/validators/content.validator';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';
import {CommonValidator} from '@shared/validators/common.validator';

@Component({
  selector: 'll-content-page-add-dialog',
  templateUrl: './content-page-add-dialog.component.html',
  styleUrls: ['./content-page-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentPageAddDialogComponent {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', [...ContentValidator.NAME, CommonValidator.reservedName(this.data.reservedNames)]),
    slug: this.fb.control('', [...ContentValidator.SLUG, CommonValidator.reservedName(this.data.reservedSlugs)]),
    schematic: this.fb.control(undefined, ContentValidator.SCHEMA)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: ContentPageAddDialogModel
  ) {
  }
}
