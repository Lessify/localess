import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ImportDialogModel} from './import-dialog.model';
import {KeyValue} from '@angular/common';
import {MatSelectChange} from '@angular/material/select';

@Component({
  selector: 'll-translation-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportDialogComponent {

  exportKinds: KeyValue<string, string>[] = [
    {key: 'FULL', value: 'FULL'},
    {key: 'FLAT', value: 'FLAT JSON'}
  ]
  fileWrong = false;
  fileName = ''
  fileAccept = '.llt.zip'

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
    file: this.fb.control<File | undefined>(undefined, [Validators.required]),
  });

  constructor(
    private readonly cd: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ImportDialogModel
  ) {
  }

  async onFileChange(event: Event): Promise<void> {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        this.fileName = target.files[0].name;
        this.fileWrong = !this.fileName.endsWith(this.fileAccept);
        this.form.patchValue({
          file: target.files[0]
        })
      }
    }
    this.cd.markForCheck()
  }

  onKindSelectionChange(event: MatSelectChange): void {
    console.log(event)
    if ( event.value === 'FULL') {
      this.fileAccept = '.llt.zip'
    } else if (event.value === 'FLAT') {
      this.fileAccept = '.json'
    }
    this.fileName = '';
    this.fileWrong = false;
    this.cd.markForCheck()
  }
}
