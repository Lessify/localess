import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TranslationExportDialogModel} from './translation-export-dialog.model';
import {KeyValue} from '@angular/common';
import {MatDatepickerInputEvent} from '@angular/material/datepicker';

@Component({
  selector: 'll-translation-export-dialog',
  templateUrl: './translation-export-dialog.component.html',
  styleUrls: ['./translation-export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationExportDialogComponent {

  today = new Date

  exportKinds: KeyValue<string, string>[] = [
    {key: 'FULL', value: 'JSON FULL'},
    {key: 'FLAT', value: 'JSON FLAT'}
  ]

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
    fromDate: this.fb.control(undefined),
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: TranslationExportDialogModel
  ) {
  }


  dateChange(event: MatDatepickerInputEvent<unknown>): void {
    if (event.value instanceof Date) {
      this.form.controls['fromDate'].setValue(event.value.getTime());
    }
  }
}
