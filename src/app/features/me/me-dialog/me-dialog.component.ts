import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MeDialogModel } from './me-dialog.model';

@Component({
  selector: 'll-me-dialog',
  templateUrl: './me-dialog.component.html',
  styleUrls: ['./me-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    displayName: this.fb.control(undefined),
    photoURL: this.fb.control(undefined),
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: MeDialogModel
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
