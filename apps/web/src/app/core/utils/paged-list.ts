import { HttpParams } from '@angular/common/http';
import { computed, linkedSignal, signal } from '@angular/core';
import type { Page } from '@localess/shared';

/** A sort direction as the table's sort header gives it: `''` is no sort (the server's default order). */
export type PagedListDirection = 'asc' | 'desc' | '';

/** A filter's value: several values are sent as the parameter repeated (`status=FAILED&status=FINISHED`). */
export type PagedListFilter = string | string[] | undefined;

/**
 * The state of a list paged on the server (`Page<T>` endpoints: `page`, `size`, `sort`, `direction` and the
 * endpoint's filters), as signals; `params()` is the query to send. The paginator binds `page` and `size`. `derived`
 * adds filters read from elsewhere (a `FolderList`'s folder, from `SpaceStore`): read, never copied, so the query is
 * never half changed. A sort, filter or derived change starts again from the first page.
 */
export class PagedList {
  readonly size = signal(20);
  readonly sort = signal('');
  readonly direction = signal<PagedListDirection>('');
  readonly filters = signal<Record<string, PagedListFilter>>({});
  private readonly derived: () => Record<string, PagedListFilter>;
  /** Back to 0 whenever the sort, a filter or a derived filter changes; the paginator and `onLoaded` set it. */
  readonly page = linkedSignal({
    source: () => [this.sort(), this.direction(), this.filters(), this.derived()],
    computation: () => 0,
  });

  constructor(size = 20, derived: () => Record<string, PagedListFilter> = () => ({})) {
    this.size.set(size);
    this.derived = derived;
  }

  readonly params = computed(() => {
    let params = new HttpParams().set('page', this.page()).set('size', this.size());
    if (this.sort() && this.direction()) params = params.set('sort', this.sort()).set('direction', this.direction());
    for (const [key, value] of Object.entries({ ...this.filters(), ...this.derived() })) {
      if (Array.isArray(value)) for (const it of value) params = params.append(key, it);
      else if (value) params = params.set(key, value);
    }
    return params;
  });

  setSort(sort: string, direction: PagedListDirection): void {
    this.sort.set(sort);
    this.direction.set(direction);
  }

  setFilters(filters: Record<string, PagedListFilter>): void {
    this.filters.set(filters);
  }

  /** A page past the end (rows deleted meanwhile): move to the last page there is. */
  onLoaded(page: Page<unknown>): void {
    if (page.items.length === 0 && page.total > 0 && page.page > 0) this.page.set(Math.ceil(page.total / page.size) - 1);
  }
}
