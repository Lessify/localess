import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {FolderAddDialogModel} from './folder-add-dialog.model';
import {ContentValidator} from '@shared/validators/contentValidator';
import {FormErrorHandlerService} from '../../../core/error-handler/form-error-handler.service';

@Component({
  selector: 'll-folder-add-dialog',
  templateUrl: './folder-add-dialog.component.html',
  styleUrls: ['./folder-add-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FolderAddDialogComponent implements OnInit {

  form: FormGroup = this.fb.group({
    name: this.fb.control('', ContentValidator.NAME),
    slug: this.fb.control('', ContentValidator.SLUG),
    schematic: this.fb.control(undefined, ContentValidator.SCHEMA)
  });

  constructor(
    private readonly fb: FormBuilder,
    readonly fe: FormErrorHandlerService,
    @Inject(MAT_DIALOG_DATA) public data: FolderAddDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
