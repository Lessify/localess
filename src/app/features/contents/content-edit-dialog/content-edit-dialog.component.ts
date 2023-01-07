import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ContentEditDialogModel} from './content-edit-dialog.model';
import {ContentValidator} from '@shared/validators/content.validator';
import {FormErrorHandlerService} from '@core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-content-edit-dialog',
  templateUrl: './content-edit-dialog.component.html',
  styleUrls: ['./content-edit-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentEditDialogComponent implements OnInit {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', ContentValidator.NAME),
    slug: this.fb.control('', ContentValidator.SLUG)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA)
    public data: ContentEditDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data.page);
    }
  }

}
