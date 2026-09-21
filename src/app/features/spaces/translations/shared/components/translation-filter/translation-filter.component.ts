import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCirclePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { Locale } from '@shared/models/locale.model';
import { LocaleStatus, TranslationStatus } from '@shared/models/translation.model';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { debounceTime } from 'rxjs';

export interface TranslationFilterCriteria {
  locale: string;
  search: string;
  labels: string[];
  states: (TranslationStatus | LocaleStatus)[];
}

@Component({
  selector: 'll-translation-filter',
  templateUrl: './translation-filter.component.html',
  styleUrls: ['./translation-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HlmButtonImports,
    HlmIconImports,
    HlmButtonGroupImports,
    HlmPopoverImports,
    HlmCommandImports,
    HlmBadgeImports,
    HlmInputGroupImports,
    HlmFieldImports,
    HlmSelectImports,
    LocaleIconComponent,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideCirclePlus,
      lucideCheck,
      lucideX,
    }),
  ],
})
export class TranslationFilterComponent {
  private readonly fb = inject(FormBuilder);

  // Inputs
  readonly availableLocales = input.required<Locale[]>();
  readonly localeFallbackId = input<string | undefined>(undefined);
  readonly allLabels = input<string[]>([]);

  // Outputs
  readonly localeChange = output<string>();
  readonly filterChange = output<TranslationFilterCriteria>();

  readonly allTranslationStates = [TranslationStatus.TRANSLATED, TranslationStatus.PARTIALLY_TRANSLATED, TranslationStatus.UNTRANSLATED];
  readonly translationStatesDictionary: Record<TranslationStatus, string> = {
    [TranslationStatus.TRANSLATED]: 'Translated',
    [TranslationStatus.PARTIALLY_TRANSLATED]: 'Partially Translated',
    [TranslationStatus.UNTRANSLATED]: 'Untranslated',
  };
  readonly allLocaleStates = [LocaleStatus.TRANSLATED, LocaleStatus.UNTRANSLATED];
  readonly localeStatesDictionary: Record<LocaleStatus, string> = {
    [LocaleStatus.TRANSLATED]: 'Translated',
    [LocaleStatus.UNTRANSLATED]: 'Untranslated',
  };

  // Form
  readonly filterForm = this.fb.group({
    locale: this.fb.control<string>('', [Validators.required]),
    search: this.fb.control<string>('', []),
    labels: this.fb.control<string[]>([], []),
    states: this.fb.control<(TranslationStatus | LocaleStatus)[]>([], []),
  });

  constructor() {
    this.filterForm.controls.locale.valueChanges.pipe(takeUntilDestroyed()).subscribe(locale => {
      this.localeChange.emit(locale || '');
    });
    this.filterForm.valueChanges.pipe(debounceTime(500), takeUntilDestroyed()).subscribe(value => {
      this.filterChange.emit({
        locale: value.locale || '',
        search: value.search || '',
        labels: value.labels || [],
        states: value.states || [],
      });
    });
    effect(() => {
      const fallbackId = this.localeFallbackId();
      if (fallbackId && this.filterForm.value.locale === '') {
        this.filterForm.patchValue({ locale: fallbackId });
      }
    });
  }

  localeIdToString = (id: string): string => this.availableLocales().find(l => l.id === id)?.name ?? id;

  filterReset(): void {
    this.filterForm.patchValue({
      search: '',
      labels: [],
      states: [],
    });
  }

  isFormChanged(): boolean {
    const { search, states, labels } = this.filterForm.value;
    return search !== '' || (labels && labels.length > 0) || (states && states.length > 0) || false;
  }

  selectLabel(label: string): void {
    const current = this.filterForm.controls.labels.value || [];
    if (current.includes(label)) {
      this.filterForm.controls.labels.setValue(current.filter(l => l !== label));
    } else {
      this.filterForm.controls.labels.setValue([...current, label]);
    }
  }

  selectState(state: TranslationStatus | LocaleStatus): void {
    const current = this.filterForm.controls.states.value || [];
    if (current.includes(state)) {
      this.filterForm.controls.states.setValue(current.filter(l => l !== state));
    } else {
      this.filterForm.controls.states.setValue([...current, state]);
    }
  }
}
