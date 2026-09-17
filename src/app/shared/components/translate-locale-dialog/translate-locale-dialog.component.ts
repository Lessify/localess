import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@shared/models/locale.model';
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
    // The source defaults to the default locale: that is the one an author fills in first, so it is
    // the one with something to translate from. Only the content side has it - on the Translations
    // screen every locale is a real language and this falls through to the first supported one.
    sourceLocale: this.fb.control(
      this.preselect(CONTENT_DEFAULT_LOCALE.id, it => this.canTranslateFrom(it)),
      [Validators.required],
    ),
    // The target defaults to the locale the caller is showing - translating into the locale you are
    // looking at is why the dialog is opened.
    targetLocale: this.fb.control(
      this.preselect(this.data.selectedLocale, it => this.canTranslateTo(it)),
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

  /**
   * Marks the caller's current locale in the list, so an author reading two identical locale names
   * can tell which end was filled in for them.
   */
  localeLabel(locale: Locale): string {
    return locale.id === this.data.selectedLocale ? `${locale.name} (Currently Selected)` : locale.name;
  }

  /**
   * The preselected locale for one end of the translation: `preferred` when the space has it and
   * the provider supports it in that direction, otherwise the first locale that is supported.
   *
   * Preselecting a locale the provider rejects would offer a translation that can only fail, and
   * the whole list - and so the first entry - may be unsupported, hence the `null`.
   */
  private preselect(preferred: string | undefined, isSupported: (locale: Locale) => boolean): string | null {
    const wanted = this.data.locales.find(it => it.id === preferred);
    if (wanted && isSupported(wanted)) {
      return wanted.id;
    }
    return this.data.locales.find(isSupported)?.id ?? null;
  }

  protected readonly localeItemToString = (value: string): string => {
    const locale = this.data.locales.find(l => l.id === value);
    return locale ? this.localeLabel(locale) : value;
  };
}
