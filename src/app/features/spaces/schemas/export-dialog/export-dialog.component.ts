import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';

@Component({
  selector: 'll-content-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
