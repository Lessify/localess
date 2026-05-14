import { KeyValue } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import { lucideUpload, lucideUploadCloud } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { ImportDialogModel } from './import-dialog.model';

@Component({
  selector: 'll-translation-import-dialog',
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmIconImports, HlmSelectImports],
  providers: [provideIcons({ lucideUpload, lucideUploadCloud })],
})
export class ImportDialogComponent implements OnInit {
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

  protected readonly kindItemToString = (value: string): string => {
    return this.exportKinds.find(k => k.key === value)?.value ?? value;
  };

  protected readonly localeItemToString = (value: string): string => {
    return this.data.locales.find(l => l.id === value)?.name ?? value;
  };

  ngOnInit(): void {
    this.form.controls['kind'].valueChanges.subscribe(value => {
      this.fileAccept = value === 'FLAT' ? '.json' : '.llt.zip';
      this.fileName = '';
      this.fileWrong = false;
      this.cd.markForCheck();
    });
  }

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
}
