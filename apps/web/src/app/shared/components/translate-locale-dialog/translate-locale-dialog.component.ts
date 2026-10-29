import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LocaleService } from '@core/services/locale.service';
import { CONTENT_DEFAULT_LOCALE, Locale } from '@localess/shared';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { TranslateLocaleDialogContext, TranslateLocaleDialogResult } from './translate-locale-dialog.model';

@Component({
  selector: 'll-translate-locale-dialog',
  templateUrl: './translate-locale-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [
    HlmDialogImports,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmFieldImports,
    HlmSelectImports,
    LocaleIconComponent,
  ],
})
export class TranslateLocaleDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly localeService = inject(LocaleService);
  private readonly dialogRef = inject<BrnDialogRef<TranslateLocaleDialogResult>>(BrnDialogRef);

  /** Required: every caller passes the space's locales, which both selects are built from. */
  readonly context = injectBrnDialogContext<TranslateLocaleDialogContext>();

  private readonly sourceLocale = this.preselect([CONTENT_DEFAULT_LOCALE.id, this.context.defaultLocale?.id], it =>
    this.canTranslateFrom(it),
  );

  form: FormGroup = this.fb.group({
    // The source defaults to the default locale: that is the one an author fills in first, so it is
    // the one with something to translate from. The content side lists it as the `default` sentinel,
    // the Translations screen as its real language.
    sourceLocale: this.fb.control(this.sourceLocale, [Validators.required]),
    // The target defaults to the locale the caller is showing - translating into the locale you are
    // looking at is why the dialog is opened - and otherwise to one other than the source, so the
    // dialog never opens on a pair it refuses.
    targetLocale: this.fb.control(
      this.preselect([this.context.selectedLocale], it => this.canTranslateTo(it), this.sourceLocale),
      [Validators.required],
    ),
    // Off by default: filling only empty translations is safe to run twice, overwriting is not.
    overwrite: this.fb.control(false),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /**
   * What the translation does, said before it starts: the two callers share this form but not the
   * consequence - one writes the whole space with no undo, the other only fills a form.
   */
  readonly explanation = computed(() => {
    const { sourceLocale, targetLocale, overwrite } = this.value();
    const source = this.localeName(sourceLocale);
    const target = this.localeName(targetLocale);
    if (this.context.mode === 'review') {
      return `The document's ${target} fields are filled from ${source}. Nothing is saved: review them, then press Save.`;
    }
    const kept = overwrite ? '' : ` Keys that already have a ${target} value keep it.`;
    return `Every key is translated from ${source} into ${target} and saved at once, as a task.${kept}`;
  });

  /** Only where the overwrite is saved: replaced translations are gone, nothing undoes the task. */
  readonly overwriteWarning = computed(() =>
    this.context.mode === 'save' && this.value().overwrite
      ? `Existing ${this.localeName(this.value().targetLocale)} translations will be replaced. This cannot be undone.`
      : undefined,
  );

  readonly submitLabel = this.context.mode === 'save' ? 'Translate and Save' : 'Translate';

  /**
   * `data.locales` can carry the `default` sentinel rather than a language - that is how the
   * content side labels the fallback - so support is decided on the resolved locale.
   */
  canTranslateFrom(locale: Locale): boolean {
    return this.localeService.isLocaleTranslatableFrom(locale.id, this.context.defaultLocale?.id);
  }

  canTranslateTo(locale: Locale): boolean {
    return this.localeService.isLocaleTranslatableTo(locale.id, this.context.defaultLocale?.id);
  }

  /**
   * Guards the Translate button. The selects only offer supported locales, but a space whose
   * locales are all unsupported in one direction leaves that control empty, and nothing else would
   * stop the dialog from returning it.
   */
  isSelectionTranslatable(): boolean {
    const { sourceLocale, targetLocale } = this.form.value;
    const find = (id: string) => this.context.locales.find(it => it.id === id);
    const source = find(sourceLocale);
    const target = find(targetLocale);
    return source !== undefined && target !== undefined && this.canTranslateFrom(source) && this.canTranslateTo(target);
  }

  /**
   * Marks the caller's current locale in the list, so an author reading two identical locale names
   * can tell which end was filled in for them.
   */
  localeLabel(locale: Locale): string {
    return locale.id === this.context.selectedLocale ? `${locale.name} (Currently Selected)` : locale.name;
  }

  /**
   * The preselected locale for one end of the translation: the first of `preferred` that the space
   * has and the provider supports in that direction, otherwise the first supported locale - one
   * other than `avoid` when there is such.
   *
   * Preselecting a locale the provider rejects would offer a translation that can only fail, and
   * the whole list - and so the first entry - may be unsupported, hence the `null`.
   */
  private preselect(preferred: (string | undefined)[], isSupported: (locale: Locale) => boolean, avoid?: string | null): string | null {
    for (const id of preferred) {
      const wanted = this.context.locales.find(it => it.id === id);
      if (wanted && isSupported(wanted)) {
        return wanted.id;
      }
    }
    const supported = this.context.locales.filter(isSupported);
    return (supported.find(it => it.id !== avoid) ?? supported[0])?.id ?? null;
  }

  private localeName(id: string | null | undefined): string {
    return this.context.locales.find(it => it.id === id)?.name ?? id ?? '';
  }

  protected readonly localeItemToString = (value: string): string => {
    const locale = this.context.locales.find(l => l.id === value);
    return locale ? this.localeLabel(locale) : value;
  };

  save(): void {
    this.dialogRef.close(this.form.value as TranslateLocaleDialogResult);
  }
}
