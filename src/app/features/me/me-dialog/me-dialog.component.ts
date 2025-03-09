import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MeDialogModel } from './me-dialog.model';

@Component({
  selector: 'll-me-dialog',
  standalone: true,
  templateUrl: './me-dialog.component.html',
  styleUrls: ['./me-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButtonModule],
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
