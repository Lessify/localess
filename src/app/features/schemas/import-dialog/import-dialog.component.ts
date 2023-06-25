import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {ImportDialogModel} from './import-dialog.model';

@Component({
  selector: 'll-schema-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportDialogComponent {

  contentFieldsCount = 0;
  fileWrong = false;
  fileName = ''

  form: FormGroup = this.fb.group({
    schemas: this.fb.control(undefined, [Validators.required]),
  });

  constructor(
    private readonly cd: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ImportDialogModel
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
        if (Array.isArray(fileContent)) {
          // TODO add more checks
          this.contentFieldsCount = fileContent.length
          this.form.patchValue({
            schemas: fileContent
          })
        } else {
          this.fileWrong = true
          this.contentFieldsCount = 0
        }
      }
    }
    this.cd.markForCheck()
  }
}
