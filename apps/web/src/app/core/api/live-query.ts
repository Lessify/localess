import { inject } from '@angular/core';
import { debounceTime, filter, merge, Observable, of, switchMap } from 'rxjs';

import { ChangeEvent, ChangeEventsService } from './change-events.service';

export interface LiveScope {
  /** The space whose events matter; omit for global data (spaces list, users, settings). */
  spaceId?: string;
  /** Entities whose changes trigger a refetch, e.g. `['contents']`. */
  entities: string[];
  /** Only events about this id (detail views). */
  id?: string;
}

const matches = (scope: LiveScope) => (event: ChangeEvent) =>
  event.entity === '*' ||
  (scope.entities.includes(event.entity) && (scope.id === undefined || event.id === undefined || event.id === scope.id));

/**
 * A long-lived query like Firestore's `collectionData`/`docData`: fetches now, then again (debounced)
 * whenever a matching change event arrives. Must be called in an injection context.
 */
export function liveQuery<T>(scope: LiveScope, fetch: () => Observable<T>): Observable<T> {
  const events = inject(ChangeEventsService).changes(scope.spaceId);
  return merge(of(null), events.pipe(filter(matches(scope)), debounceTime(100))).pipe(switchMap(() => fetch()));
}

/** Same as `liveQuery`, for services that captured `ChangeEventsService` themselves. */
export function liveQueryWith<T>(events: ChangeEventsService, scope: LiveScope, fetch: () => Observable<T>): Observable<T> {
  return merge(of(null), events.changes(scope.spaceId).pipe(filter(matches(scope)), debounceTime(100))).pipe(switchMap(() => fetch()));
}
