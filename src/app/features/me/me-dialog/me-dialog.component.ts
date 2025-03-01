import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MeDialogModel } from './me-dialog.model';
import { MatFormField } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-me-dialog',
  standalone: true,
  templateUrl: './me-dialog.component.html',
  styleUrls: ['./me-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogTitle, MatDialogContent, MatFormField, ReactiveFormsModule, MatInput, MatDialogActions, MatButton, MatDialogClose],
})
export class MeDialogComponent implements OnInit {
  form: FormGroup = this.fb.group({
    displayName: this.fb.control(undefined),
    photoURL: this.fb.control(undefined),
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: MeDialogModel,
  ) {}

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
