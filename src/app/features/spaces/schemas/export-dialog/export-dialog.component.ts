import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'll-content-export-dialog',
  standalone: true,
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInput, MatDatepickerModule, MatIcon, MatButtonModule],
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
