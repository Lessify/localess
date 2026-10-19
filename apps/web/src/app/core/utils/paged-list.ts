import { HttpParams } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import type { Page } from '@localess/shared';

/** A sort direction as the table's sort header gives it: `''` is no sort (the server's default order). */
export type PagedListDirection = 'asc' | 'desc' | '';

/** A filter's value: several values are sent as the parameter repeated (`status=FAILED&status=FINISHED`). */
export type PagedListFilter = string | string[] | undefined;

/**
 * The state of a list paged on the server (`Page<T>` endpoints: `page`, `size`, `sort`, `direction` and the
 * endpoint's filters), as signals; `params()` is the query to send. The paginator binds `page` and `size`; a sort or
 * filter change starts again from the first page.
 */
export class PagedList {
  readonly page = signal(0);
  readonly size = signal(20);
  readonly sort = signal('');
  readonly direction = signal<PagedListDirection>('');
  readonly filters = signal<Record<string, PagedListFilter>>({});

  constructor(size = 20) {
    this.size.set(size);
  }

  readonly params = computed(() => {
    let params = new HttpParams().set('page', this.page()).set('size', this.size());
    if (this.sort() && this.direction()) params = params.set('sort', this.sort()).set('direction', this.direction());
    for (const [key, value] of Object.entries(this.filters())) {
      if (Array.isArray(value)) for (const it of value) params = params.append(key, it);
      else if (value) params = params.set(key, value);
    }
    return params;
  });

  setSort(sort: string, direction: PagedListDirection): void {
    this.sort.set(sort);
    this.direction.set(direction);
    this.page.set(0);
  }

  setFilters(filters: Record<string, PagedListFilter>): void {
    this.filters.set(filters);
    this.page.set(0);
  }

  /** A page past the end (rows deleted meanwhile): move to the last page there is. */
  onLoaded(page: Page<unknown>): void {
    if (page.items.length === 0 && page.total > 0 && page.page > 0) this.page.set(Math.ceil(page.total / page.size) - 1);
  }
}
