import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormErrorHandlerService } from '@core/error-handler/form-error-handler.service';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { Locale } from '@shared/models/locale.model';
import { LocaleService } from '@shared/services/locale.service';
import { LocaleValidator } from '@shared/validators/locale.validator';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmComboboxImports } from '@spartan-ng/helm/combobox';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmFieldImports } from '@spartan-ng/helm/field';

import { LocaleDialogContext, LocaleDialogResult } from './locale-dialog.model';

@Component({
  selector: 'll-locale-dialog',
  templateUrl: './locale-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid gap-4' },
  imports: [ReactiveFormsModule, HlmComboboxImports, HlmFieldImports, HlmButtonImports, HlmDialogImports, LocaleIconComponent],
})
export class LocaleDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly localeService = inject(LocaleService);
  private readonly dialogRef = inject<BrnDialogRef<LocaleDialogResult>>(BrnDialogRef);
  readonly fe = inject(FormErrorHandlerService);

  /**
   * Optional on purpose: a caller that passes nothing gets the full list. Spartan hands the context
   * over through CDK's `DIALOG_DATA` rather than `MAT_DIALOG_DATA`, and it must be an object - an
   * array would be spread into index keys by `HlmDialogService`.
   */
  private readonly context = injectBrnDialogContext<LocaleDialogContext>({ optional: true });

  locales: Locale[] = [];
  form: FormGroup = this.fb.group({
    locale: this.fb.control<Locale | undefined>(undefined, LocaleValidator.LOCALE),
  });
  search = signal('');
  filteredOptions = computed(() => {
    const search = this.search().trim().toLowerCase();
    if (search) {
      return this.locales.filter(option => option.name.toLowerCase().includes(search));
    }
    return this.locales;
  });

  ngOnInit(): void {
    this.localeService.findAllLocales().subscribe(response => {
      this.locales = response;
      // `?.` because the injection above is optional: without it, a dialog opened with no context
      // at all throws here rather than falling back to the full list.
      if (this.context?.locales != null) {
        this.context.locales.forEach(it => {
          const pos: number = this.locales.findIndex(row => row.id === it.id);
          this.locales.splice(pos, 1);
        });
      }
    });
  }

  displayLocale(locale?: Locale): string {
    return locale ? `${locale.name} (${locale.id})` : '';
  }

  save(): void {
    this.dialogRef.close(this.form.value as LocaleDialogResult);
  }
}
