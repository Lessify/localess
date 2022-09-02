import {ChangeDetectionStrategy, Component, Inject} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TranslationExportDialogModel} from './translation-export-dialog.model';

@Component({
  selector: 'll-translation-export-dialog',
  templateUrl: './translation-export-dialog.component.html',
  styleUrls: ['./translation-export-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationExportDialogComponent {

  exportKind = ['FULL', 'FLAT']

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
  });

  constructor(
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: TranslationExportDialogModel
  ) {
  }


}
