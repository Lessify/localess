import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { ImportDialogModel } from './import-dialog.model';

@Component({
  selector: 'll-translation-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule],
})
export class ImportDialogComponent {
  private readonly cd = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  data = inject<ImportDialogModel>(MAT_DIALOG_DATA);

  exportKinds: KeyValue<string, string>[] = [
    { key: 'FULL', value: 'FULL' },
    { key: 'FLAT', value: 'FLAT JSON' },
  ];
  fileWrong = false;
  fileName = '';
  fileAccept = '.llt.zip';

  form: FormGroup = this.fb.group({
    kind: this.fb.control('FULL', [Validators.required]),
    locale: this.fb.control(undefined),
    file: this.fb.control<File | undefined>(undefined, [Validators.required]),
  });

  async onFileChange(event: Event): Promise<void> {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.fileName = target.files[0].name;
        this.fileWrong = !this.fileName.endsWith(this.fileAccept);
        this.form.patchValue({
          file: target.files[0],
        });
      }
    }
    this.cd.markForCheck();
  }

  onKindSelectionChange(event: MatSelectChange): void {
    console.log(event);
    if (event.value === 'FULL') {
      this.fileAccept = '.llt.zip';
    } else if (event.value === 'FLAT') {
      this.fileAccept = '.json';
    }
    this.fileName = '';
    this.fileWrong = false;
    this.cd.markForCheck();
  }
}
