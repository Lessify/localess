import { DataSource } from '@angular/cdk/collections';
import { computed, Injector, isSignal, Signal, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { SortDirection } from './table-sort.directive';

export type SortingDataAccessor<T> = (row: T, columnId: string) => string | number;
export type TableFilterPredicate<T> = (row: T, filter: string) => boolean;

export interface TableDataSourceSort {
  active: Signal<string>;
  direction: Signal<SortDirection>;
}

export interface TableDataSourcePaginator {
  pageIndex: Signal<number>;
  pageSize: Signal<number>;
}

/** Numbers beyond this can't be compared reliably, so they're left as strings, mirroring MatTableDataSource. */
const MAX_SAFE_INTEGER = 9007199254740991;

/** Local port of CDK's internal (non-public-API) `_isNumberValue`, used by MatTableDataSource's default accessor. */
function isNumberValue(value: unknown): boolean {
  return !isNaN(parseFloat(value as string)) && !isNaN(Number(value));
}

function defaultSortingDataAccessor<T>(row: T, columnId: string): string | number {
  const value = (row as Record<string, unknown>)[columnId];
  if (isNumberValue(value)) {
    const numberValue = Number(value);
    return numberValue < MAX_SAFE_INTEGER ? numberValue : (value as string);
  }
  return (value ?? '') as string | number;
}

function defaultFilterPredicate<T>(row: T, filter: string): boolean {
  return JSON.stringify(row).toLowerCase().includes(filter.toLowerCase());
}

/**
 * Signal-based CDK DataSource that auto-sorts/auto-filters/auto-paginates,
 * mirroring MatTableDataSource's ergonomics without any Material dependency.
 * Must be constructed with an Injector obtained from an Angular injection
 * context (e.g. `inject(Injector)` in a component field initializer), since
 * `connect()` uses `toObservable()` internally.
 */
export class TableDataSource<T> extends DataSource<T> {
  private readonly data: Signal<T[]>;
  private readonly filterSignal = signal('');
  private readonly sortSignal = signal<TableDataSourceSort | null>(null);
  private readonly paginatorSignal = signal<TableDataSourcePaginator | null>(null);

  sortingDataAccessor: SortingDataAccessor<T> = defaultSortingDataAccessor;
  filterPredicate: TableFilterPredicate<T> = defaultFilterPredicate;

  constructor(
    data: T[] | Signal<T[]>,
    private readonly injector: Injector,
  ) {
    super();
    this.data = isSignal(data) ? data : signal(data);
  }

  set filter(value: string) {
    this.filterSignal.set(value);
  }
  get filter(): string {
    return this.filterSignal();
  }

  set sort(sort: TableDataSourceSort | null) {
    this.sortSignal.set(sort);
  }
  get sort(): TableDataSourceSort | null {
    return this.sortSignal();
  }

  set paginator(paginator: TableDataSourcePaginator | null) {
    this.paginatorSignal.set(paginator);
  }
  get paginator(): TableDataSourcePaginator | null {
    return this.paginatorSignal();
  }

  readonly filteredData: Signal<T[]> = computed(() => {
    const filter = this.filterSignal();
    const rows = this.data();
    if (!filter) return rows;
    return rows.filter(row => this.filterPredicate(row, filter));
  });

  readonly sortedData: Signal<T[]> = computed(() => {
    const rows = this.filteredData();
    const sort = this.sortSignal();
    if (!sort) return rows;
    const active = sort.active();
    const direction = sort.direction();
    if (!active || !direction) return rows;
    return [...rows].sort((a, b) => {
      const valueA = this.sortingDataAccessor(a, active);
      const valueB = this.sortingDataAccessor(b, active);
      const comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      return direction === 'asc' ? comparison : -comparison;
    });
  });

  readonly renderedData: Signal<T[]> = computed(() => {
    const rows = this.sortedData();
    const paginator = this.paginatorSignal();
    if (!paginator) return rows;
    const pageIndex = paginator.pageIndex();
    const pageSize = paginator.pageSize();
    const start = pageIndex * pageSize;
    return rows.slice(start, start + pageSize);
  });

  connect(): Observable<T[]> {
    return toObservable(this.renderedData, { injector: this.injector });
  }

  disconnect(): void {
    // No-op: the underlying signals need no manual teardown.
  }
}
