import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { TranslateLocaleDialogModel } from './translate-locale-dialog.model';

@Component({
  selector: 'll-translate-locale-dialog',
  templateUrl: './translate-locale-dialog.component.html',
  styleUrls: ['./translate-locale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmFieldImports, HlmSelectImports, BrnSelectImports],
})
export class TranslateLocaleDialogComponent {
  private readonly fb = inject(FormBuilder);
  data = inject<TranslateLocaleDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    sourceLocale: this.fb.control(this.data.locales[0].id, [Validators.required]),
    targetLocale: this.fb.control(this.data.locales[0].id, [Validators.required]),
  });
}
