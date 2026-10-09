import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  InputSignal,
  OnInit,
  output,
  Signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCirclePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmButtonGroupImports } from '@spartan-ng/helm/button-group';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmCommandImports } from '@spartan-ng/helm/command';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmPopoverImports } from '@spartan-ng/helm/popover';
import { debounceTime } from 'rxjs';

import { FilterDef, FilterToolbarValue } from './filter-toolbar.model';

type FilterControlValue = string | string[];

@Component({
  selector: 'll-filter-toolbar',
  templateUrl: './filter-toolbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [
    ReactiveFormsModule,
    HlmInputGroupImports,
    HlmButtonImports,
    HlmButtonGroupImports,
    HlmPopoverImports,
    HlmCommandImports,
    HlmBadgeImports,
    NgIcon,
    HlmCheckboxImports,
  ],
  providers: [provideIcons({ lucideCirclePlus, lucideSearch, lucideCheck, lucideX })],
})
export class FilterToolbar implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly searchEnabled: InputSignal<boolean> = input(true);
  readonly searchPlaceholder: InputSignal<string> = input('Search...');
  readonly filters: InputSignal<FilterDef[]> = input<FilterDef[]>([]);

  readonly filterChange = output<FilterToolbarValue>();

  readonly form = new FormGroup<Record<string, FormControl<FilterControlValue>>>({
    search: new FormControl<FilterControlValue>('', { nonNullable: true }),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly hasActiveValues: Signal<boolean> = computed(() => {
    const value = this.formValue();
    const search = (value['search'] as string) ?? '';
    if (search.trim() !== '') return true;
    return this.filters().some(def => {
      const v = value[def.key];
      return Array.isArray(v) ? v.length > 0 : !!v;
    });
  });

  ngOnInit(): void {
    for (const def of this.filters()) {
      this.form.addControl(def.key, new FormControl<FilterControlValue>(def.mode === 'multiple' ? [] : '', { nonNullable: true }));
    }
    this.form.valueChanges.pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      this.filterChange.emit(this.toFilterToolbarValue(value));
    });
  }

  isSelected(def: FilterDef, optionValue: string): boolean {
    const value = this.form.controls[def.key]?.value;
    return def.mode === 'multiple' ? ((value as string[]) ?? []).includes(optionValue) : value === optionValue;
  }

  select(def: FilterDef, optionValue: string): void {
    const control = this.form.controls[def.key];
    if (!control) return;
    if (def.mode === 'multiple') {
      const current = (control.value as string[]) ?? [];
      control.setValue(current.includes(optionValue) ? current.filter(v => v !== optionValue) : [...current, optionValue]);
    } else {
      control.setValue(optionValue);
    }
  }

  selectedCount(def: FilterDef): number {
    return ((this.form.controls[def.key]?.value as string[]) ?? []).length;
  }

  selectedOptionLabel(def: FilterDef): string | undefined {
    const value = this.form.controls[def.key]?.value as string;
    return def.options.find(o => o.value === value)?.label;
  }

  reset(): void {
    const value: Record<string, FilterControlValue> = { search: '' };
    for (const def of this.filters()) {
      value[def.key] = def.mode === 'multiple' ? [] : '';
    }
    this.form.setValue(value);
  }

  private toFilterToolbarValue(raw: Partial<Record<string, FilterControlValue>>): FilterToolbarValue {
    return { ...raw, search: (raw['search'] as string) ?? '' } as FilterToolbarValue;
  }
}
