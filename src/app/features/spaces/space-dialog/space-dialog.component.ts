import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup} from '@angular/forms';
import {SpaceDialogModel} from './space-dialog.model';
import {SpaceValidator} from '@shared/validators/space.validator';

@Component({
  selector: 'll-space-dialog',
  templateUrl: './space-dialog.component.html',
  styleUrls: ['./space-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpaceDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', SpaceValidator.NAME)
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: SpaceDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
