import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogContent, MatDialogModule } from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatError } from '@angular/material/form-field';

@Component({
  selector: 'll-asset-import-dialog',
  standalone: true,
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatButton,
    MatError,
  ],
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
  ) {}

  async onFileChange(event: Event): Promise<void> {
    if (event.target && event.target instanceof HTMLInputElement) {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.fileName = target.files[0].name;
        this.fileWrong = !this.fileName.endsWith('.lla.zip');
        this.form.patchValue({
          file: target.files[0],
        });
      }
    }
    this.cd.markForCheck();
  }
}
