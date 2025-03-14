import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatIconModule, MatButtonModule],
})
export class ExportDialogComponent {
  today = new Date();

  form: FormGroup = this.fb.group({
    fromDate: this.fb.control(undefined),
  });

  constructor(private readonly fb: FormBuilder) {}

  dateChange(event: MatDatepickerInputEvent<unknown>): void {
    if (event.value instanceof Date) {
      this.form.controls['fromDate'].setValue(event.value.getTime());
    }
  }
}
