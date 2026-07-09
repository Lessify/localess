import { CdkColumnDef } from '@angular/cdk/table';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  inject,
  input,
  InputSignal,
  model,
  ModelSignal,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp } from '@ng-icons/lucide';
import { HlmIconImports } from '@spartan-ng/helm/icon';

export type SortDirection = 'asc' | 'desc' | '';

export interface TableSortState {
  active: string;
  direction: SortDirection;
}

export interface SortOptions {
  start?: SortDirection;
  disableClear?: boolean;
}

/** Returns the direction cycle to use given the provided start direction and clear option, mirroring MatSort's getSortDirectionCycle. */
function sortDirectionCycle(start: SortDirection, disableClear: boolean): SortDirection[] {
  const cycle: SortDirection[] = start === 'desc' ? ['desc', 'asc'] : ['asc', 'desc'];
  if (!disableClear) {
    cycle.push('');
  }
  return cycle;
}

/** Container for TableSortHeaders to manage the sort state, mirroring MatSort. */
@Directive({
  selector: '[llTableSort]',
  exportAs: 'llTableSort',
})
export class TableSort {
  readonly active: ModelSignal<string> = model<string>('', { alias: 'llTableSortActive' });
  readonly direction: ModelSignal<SortDirection> = model<SortDirection>('', { alias: 'llTableSortDirection' });
  readonly start: InputSignal<SortDirection> = input<SortDirection>('asc', { alias: 'llTableSortStart' });
  readonly disableClear: InputSignal<boolean> = input(false, { alias: 'llTableSortDisableClear' });
  readonly disabled: InputSignal<boolean> = input(false, { alias: 'llTableSortDisabled' });
  readonly sortChange = output<TableSortState>();

  /** Sets the active sort id and determines the new sort direction, mirroring MatSort.sort(). */
  sort(columnId: string, options: SortOptions = {}): void {
    if (this.disabled()) return;
    const start = options.start ?? this.start();
    const disableClear = options.disableClear ?? this.disableClear();

    if (this.active() !== columnId) {
      this.active.set(columnId);
      this.direction.set(start);
    } else {
      const cycle = sortDirectionCycle(start, disableClear);
      const nextIndex = (cycle.indexOf(this.direction()) + 1) % cycle.length;
      const next = cycle[nextIndex];
      this.direction.set(next);
      if (next === '') {
        this.active.set('');
      }
    }
    this.sortChange.emit({ active: this.active(), direction: this.direction() });
  }
}

/**
 * Applies sorting behavior (click or Enter/Space to change sort) and renders
 * the sort direction arrow, mirroring MatSortHeader — which is a component
 * owning its own arrow markup (see sort-header.ts/.html), not a bare
 * directive that leaves rendering to the consumer. Like MatSortHeader
 * (selector '[mat-sort-header]'), this must be an attribute selector so it
 * can attach to an existing `<th llHeaderCell>` element instead of replacing
 * it with a new custom element tag.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[llTableSortHeader]',
  exportAs: 'llTableSortHeader',
  template: `
    <span class="inline-flex items-center">
      <ng-content />
      <ng-icon
        hlm
        size="sm"
        class="ml-1"
        [class.opacity-0]="!isActive()"
        [name]="direction() === 'desc' ? 'lucideArrowDown' : 'lucideArrowUp'" />
    </span>
  `,
  host: {
    class: 'cursor-pointer',
    role: 'button',
    '[attr.tabindex]': 'isDisabled() ? -1 : 0',
    '[attr.aria-sort]': 'ariaSort()',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '(click)': 'onClick()',
    '(keydown.enter)': 'onKeydown($event)',
    '(keydown.space)': 'onKeydown($event)',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmIconImports],
  providers: [provideIcons({ lucideArrowUp, lucideArrowDown })],
})
export class TableSortHeader {
  private readonly tableSort = inject(TableSort);
  private readonly columnDef = inject(CdkColumnDef, { optional: true });

  /** The id of this sort header. Defaults to the containing column's name if omitted, mirroring MatSortHeader. */
  readonly llTableSortHeader: InputSignal<string | undefined> = input<string | undefined>(undefined);
  /** Overrides the containing TableSort's start direction for this header. */
  readonly start: InputSignal<SortDirection | undefined> = input<SortDirection | undefined>(undefined);
  /** Overrides the containing TableSort's disableClear for this header. */
  readonly disableClear: InputSignal<boolean | undefined> = input<boolean | undefined>(undefined);
  /** Whether this specific header is disabled. */
  readonly disabled: InputSignal<boolean> = input(false);

  readonly id = computed(() => this.llTableSortHeader() || this.columnDef?.name || '');
  readonly isDisabled = computed(() => this.disabled() || this.tableSort.disabled());
  readonly isActive = computed(() => this.tableSort.active() === this.id());
  readonly direction = computed<SortDirection>(() => (this.isActive() ? this.tableSort.direction() : ''));
  readonly ariaSort = computed<'ascending' | 'descending' | 'none'>(() => {
    const dir = this.direction();
    if (dir === 'asc') return 'ascending';
    if (dir === 'desc') return 'descending';
    return 'none';
  });

  onClick(): void {
    if (this.isDisabled()) return;
    this.tableSort.sort(this.id(), { start: this.start(), disableClear: this.disableClear() });
  }

  onKeydown(event: Event): void {
    event.preventDefault();
    this.onClick();
  }
}
