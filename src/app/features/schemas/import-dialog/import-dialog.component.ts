import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ImportDialogModel } from './import-dialog.model';

@Component({
  selector: 'll-content-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDialogComponent {
  fileWrong = false;
  fileName = '';

  form: FormGroup = this.fb.group({
    file: this.fb.control<File | undefined>(undefined, [Validators.required]),
  });

  constructor(
    private readonly cd: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: ImportDialogModel
  ) {}

  async onFileChange(event: Event): Promise<void> {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.fileName = target.files[0].name;
        this.fileWrong = !this.fileName.endsWith('.lls.zip');
        this.form.patchValue({
          file: target.files[0],
        });
      }
    }
    this.cd.markForCheck();
  }
}
