import { HttpParams } from '@angular/common/http';
import { computed, effect, inject, Signal, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/services/notification.service';
import type { Page } from '@localess/shared';
import { Observable } from 'rxjs';

import { PagedList } from './paged-list';

/** A screen's page of a list paged on the server, as signals for its template. */
export interface PagedResource<T> {
  /** The rows of the page; the previous page's while the next one loads, so the table doesn't flash empty. */
  readonly items: Signal<T[]>;
  readonly total: Signal<number>;
  /** A page is on its way (the first, or another query's). */
  readonly loading: Signal<boolean>;
}

export interface PagedResourceOptions<T> {
  /** The query: a new one cancels the request in flight and asks again. */
  list: PagedList;
  /** The service's read, live or not (`liveQueryWith`: each change event's new page shows as it comes). */
  load: (params: HttpParams) => Observable<Page<T>>;
  /** The toast for a failed load; the previous page stays. */
  error: string;
}

/**
 * The page of `list` (a `PagedList`) read with `load`, as an `rxResource`: one request per query, no subscription to
 * manage. Must be called in an injection context (a component's field).
 */
export function pagedResource<T>({ list, load, error }: PagedResourceOptions<T>): PagedResource<T> {
  const notifications = inject(NotificationService);
  const resource = rxResource({ params: () => list.params(), stream: ({ params }) => load(params) });
  /** A resource forgets its value while the next query loads: the last page stays shown until then. */
  const page = signal<Page<T> | undefined>(undefined);
  effect(() => {
    const loaded = resource.hasValue() ? resource.value() : undefined;
    if (!loaded) return;
    page.set(loaded);
    untracked(() => list.onLoaded(loaded));
  });
  effect(() => {
    if (resource.error()) untracked(() => notifications.error(error));
  });
  return {
    items: computed(() => page()?.items ?? []),
    total: computed(() => page()?.total ?? 0),
    loading: resource.isLoading,
  };
}
