import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MeDialogModel } from './me-dialog.model';

@Component({
  selector: 'll-me-dialog',
  templateUrl: './me-dialog.component.html',
  styleUrls: ['./me-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatFormFieldModule, ReactiveFormsModule, MatInputModule, MatButtonModule],
})
export class MeDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  data = inject<MeDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    displayName: this.fb.control(undefined),
    photoURL: this.fb.control(undefined),
  });

  ngOnInit(): void {
    if (this.data != null) {
      this.form.patchValue(this.data);
    }
  }
}
