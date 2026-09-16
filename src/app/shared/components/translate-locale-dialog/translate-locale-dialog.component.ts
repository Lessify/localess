import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { TranslateLocaleDialogModel } from './translate-locale-dialog.model';

@Component({
  selector: 'll-translate-locale-dialog',
  templateUrl: './translate-locale-dialog.component.html',
  styleUrls: ['./translate-locale-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, HlmButtonImports, HlmCheckboxImports, HlmFieldImports, HlmSelectImports],
})
export class TranslateLocaleDialogComponent {
  private readonly fb = inject(FormBuilder);
  data = inject<TranslateLocaleDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    sourceLocale: this.fb.control(this.data.locales[0].id, [Validators.required]),
    targetLocale: this.fb.control(this.data.locales[0].id, [Validators.required]),
    // Off by default: filling only empty translations is safe to run twice, overwriting is not.
    overwrite: this.fb.control(false),
  });

  protected readonly localeItemToString = (value: string): string => {
    return this.data.locales.find(l => l.id === value)?.name ?? value;
  };
}
