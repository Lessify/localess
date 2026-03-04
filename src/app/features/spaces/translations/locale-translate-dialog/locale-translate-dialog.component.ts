import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LocaleTranslateDialogModel } from './locale-translate-dialog.model';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'll-locale-translate-dialog',
  templateUrl: './locale-translate-dialog.component.html',
  styleUrls: ['./locale-translate-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmSelectImports, BrnSelectImports],
})
export class LocaleTranslateDialogComponent {
  private readonly fb = inject(FormBuilder);
  data = inject<LocaleTranslateDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    sourceLocale: this.fb.control(this.data.locales[0].id, [Validators.required]),
    targetLocale: this.fb.control(this.data.locales[0].id, [Validators.required]),
  });
}
