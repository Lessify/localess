import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Locale } from '@localess/shared';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCirclePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { LocaleIconComponent } from '@shared/components/locale-icon';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmFieldImports } from '@spartan-ng/helm/field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { HlmSelectImports } from '@spartan-ng/helm/select';

import { LocaleStatus, TRANSLATION_STATUS_LABELS, TranslationStatus } from '../../models/translation-status.model';

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
  readonly defaultLocaleId = input<string | undefined>(undefined);
  readonly allLabels = input<string[]>([]);

  // Outputs
  readonly localeChange = output<string>();
  readonly filterChange = output<TranslationFilterCriteria>();

  readonly allTranslationStates = [TranslationStatus.TRANSLATED, TranslationStatus.PARTIALLY_TRANSLATED, TranslationStatus.UNTRANSLATED];
  readonly translationStatesDictionary = TRANSLATION_STATUS_LABELS;
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
    // Labels, statuses and the locale apply at once; the search only on Enter (`applySearch`), or when the box is emptied.
    this.filterForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(value => {
      if (!value.search?.trim()) this.appliedSearch.set('');
      this.emitFilter();
    });
    effect(() => {
      const fallbackId = this.defaultLocaleId();
      if (fallbackId && this.filterForm.value.locale === '') {
        this.filterForm.patchValue({ locale: fallbackId });
      }
    });
  }

  /** The search the list and tree show: what was in the box at the last Enter. */
  private readonly appliedSearch = signal('');
  private readonly typedSearch = toSignal(this.filterForm.controls.search.valueChanges, { initialValue: '' });
  /** The box holds text the list doesn't show yet: the box is marked and the Search button waits for Enter or a click. */
  readonly searchPending = computed(() => (this.typedSearch() ?? '').trim() !== this.appliedSearch());
  /** The last criteria sent: typing changes the form, but sends nothing new until Enter. */
  private emitted = '';

  /** Enter in the search box: search now (and keep the browser from submitting the form). */
  applySearch(event?: Event): void {
    event?.preventDefault();
    this.appliedSearch.set(this.filterForm.controls.search.value?.trim() ?? '');
    this.emitFilter();
  }

  private emitFilter(): void {
    const value = this.filterForm.getRawValue();
    const criteria: TranslationFilterCriteria = {
      locale: value.locale || '',
      search: this.appliedSearch(),
      labels: value.labels || [],
      states: value.states || [],
    };
    const key = JSON.stringify(criteria);
    if (key === this.emitted) return;
    this.emitted = key;
    this.filterChange.emit(criteria);
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
