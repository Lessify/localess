import {ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {TranslateDialogModel} from './translate-dialog.model';

@Component({
  selector: 'll-translate-dialog',
  templateUrl: './translate-dialog.component.html',
  styleUrls: ['./translate-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslateDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)])
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: TranslateDialogModel
  ) {
  }

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
