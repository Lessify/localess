import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ExportDialogModel } from './export-dialog.model';
import { KeyValue } from '@angular/common';
import { MatDatepickerInputEvent, MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormField } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'll-translation-export-dialog',
  standalone: true,
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormField,
    MatSelect,
    MatOption,
    MatInput,
    MatIcon,
    MatDatepickerModule,
    MatButton,
  ],
})
export class ExportDialogComponent {
  today = new Date();

  exportKinds: KeyValue<string, string>[] = [
    { key: 'FULL', value: 'FULL' },
    { key: 'FLAT', value: 'FLAT JSON' },
  ];

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
    fromDate: this.fb.control(undefined),
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ExportDialogModel,
  ) {
  }

  dateChange(event: MatDatepickerInputEvent<unknown>): void {
    if (event.value instanceof Date) {
      this.form.controls['fromDate'].setValue(event.value.getTime());
    }
  }
}
