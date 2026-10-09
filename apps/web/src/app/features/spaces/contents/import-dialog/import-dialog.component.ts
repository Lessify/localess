import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideUpload, lucideUploadCloud } from '@ng-icons/lucide';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmIconImports } from '@spartan-ng/helm/icon';

import { ImportDialogResult } from './import-dialog.model';

@Component({
  selector: 'll-content-import-dialog',
  templateUrl: './import-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [HlmDialogImports, ReactiveFormsModule, HlmButtonImports, HlmIconImports],
  providers: [provideIcons({ lucideUpload, lucideUploadCloud })],
})
export class ImportDialogComponent {
  private readonly cd = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<ImportDialogResult>>(BrnDialogRef);

  fileWrong = false;
  fileName = '';

  form: FormGroup = this.fb.group({
    file: this.fb.control<File | undefined>(undefined, [Validators.required]),
  });

  async onFileChange(event: Event): Promise<void> {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.fileName = target.files[0].name;
        this.fileWrong = !this.fileName.endsWith('.llc.zip');
        this.form.patchValue({
          file: target.files[0],
        });
      }
    }
    this.cd.markForCheck();
  }

  save(): void {
    this.dialogRef.close(this.form.value as ImportDialogResult);
  }
}
