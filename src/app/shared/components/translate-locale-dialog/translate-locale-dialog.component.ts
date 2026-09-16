import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
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
  private readonly localeService = inject(LocaleService);
  data = inject<TranslateLocaleDialogModel>(MAT_DIALOG_DATA);

  form: FormGroup = this.fb.group({
    // Pre-selecting a locale the provider rejects would offer a translation that can only fail, so
    // each end starts on the first locale supported in its own direction - the whole list, and so
    // the first entry, may be unsupported.
    sourceLocale: this.fb.control(
      this.firstSupported(it => this.canTranslateFrom(it)),
      [Validators.required],
    ),
    targetLocale: this.fb.control(
      this.firstSupported(it => this.canTranslateTo(it)),
      [Validators.required],
    ),
    // Off by default: filling only empty translations is safe to run twice, overwriting is not.
    overwrite: this.fb.control(false),
  });

  /**
   * `data.locales` can carry the `default` sentinel rather than a language - that is how the
   * content side labels the fallback - so support is decided on the resolved locale.
   */
  canTranslateFrom(locale: Locale): boolean {
    return this.localeService.isLocaleTranslatableFrom(locale.id, this.data.localeFallback?.id);
  }

  canTranslateTo(locale: Locale): boolean {
    return this.localeService.isLocaleTranslatableTo(locale.id, this.data.localeFallback?.id);
  }

  /**
   * Guards the Translate button. The selects only offer supported locales, but a space whose
   * locales are all unsupported in one direction leaves that control empty, and nothing else would
   * stop the dialog from returning it.
   */
  isSelectionTranslatable(): boolean {
    const { sourceLocale, targetLocale } = this.form.value;
    const find = (id: string) => this.data.locales.find(it => it.id === id);
    const source = find(sourceLocale);
    const target = find(targetLocale);
    return source !== undefined && target !== undefined && this.canTranslateFrom(source) && this.canTranslateTo(target);
  }

  private firstSupported(predicate: (locale: Locale) => boolean): string | null {
    return this.data.locales.find(predicate)?.id ?? null;
  }

  protected readonly localeItemToString = (value: string): string => {
    return this.data.locales.find(l => l.id === value)?.name ?? value;
  };
}
