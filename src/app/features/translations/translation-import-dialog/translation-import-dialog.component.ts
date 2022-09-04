import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {TranslationImportDialogModel} from './translation-import-dialog.model';
import {KeyValue} from '@angular/common';

@Component({
  selector: 'll-translation-import-dialog',
  templateUrl: './translation-import-dialog.component.html',
  styleUrls: ['./translation-import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TranslationImportDialogComponent {

  exportKinds: KeyValue<string, string>[] = [
    {key: 'FULL', value: 'JSON FULL'},
    {key: 'FLAT', value: 'JSON FLAT'}
  ]
  contentFieldsCount = 0;
  fileWrong = false;
  fileName = ''

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
    translations: this.fb.control(undefined, [Validators.required]),
  });

  constructor(
    private readonly cd: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: TranslationImportDialogModel
  ) {
  }

  async onFileChange(event: Event): Promise<void> {
    this.fileWrong = false
    let fileContent: any;
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement
      if (target.files && target.files.length > 0) {
        this.fileName = target.files[0].name;
        fileContent = JSON.parse(await target.files[0].text())
        if (this.form.value.kind === 'FULL' && Array.isArray(fileContent)) {
          // Full file
          this.contentFieldsCount = fileContent.length
          this.form.patchValue({
            translations: fileContent
          })
        } else if (this.form.value.kind === 'FLAT' && !Array.isArray(fileContent)) {
          // Flat file
          this.contentFieldsCount = Object.getOwnPropertyNames(fileContent).length
          this.form.patchValue({
            translations: fileContent
          })
        } else {
          this.fileWrong = true
          this.contentFieldsCount = 0
        }
      }
    }
    this.cd.markForCheck()
  }

  onKindSelectionChange(): void {
    this.form.controls['translations'].setValue(undefined);
    this.contentFieldsCount = 0;
    this.fileName = '';
    this.fileWrong = false;
    this.cd.markForCheck()
  }
}
