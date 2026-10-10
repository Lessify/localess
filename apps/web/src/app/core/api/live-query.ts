import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { debounceTime, filter, merge, Observable, of, retry, switchMap, throwError, timer } from 'rxjs';

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

/** Network failure, or the server/proxy not ready (a deploy or restart): worth retrying. */
const TRANSIENT_STATUSES = new Set([0, 502, 503, 504]);
const MAX_BACKOFF_MS = 30_000;

/**
 * Retries transient failures with backoff (1 s, 2 s, 4 s … 30 s) until the server answers, so a restart does
 * not end the live query; other errors (403, 404, 500 …) reach the subscriber as before.
 */
const retryTransient = <T>(fetch: () => Observable<T>): Observable<T> =>
  fetch().pipe(
    retry({
      delay: (error: unknown, retryCount) =>
        error instanceof HttpErrorResponse && TRANSIENT_STATUSES.has(error.status)
          ? timer(Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (retryCount - 1)))
          : throwError(() => error),
    }),
  );

/** Fetch now, then again (debounced) on every matching event; a newer event cancels a pending fetch or retry. */
const live = <T>(changes: Observable<ChangeEvent>, scope: LiveScope, fetch: () => Observable<T>): Observable<T> =>
  merge(of(null), changes.pipe(filter(matches(scope)), debounceTime(100))).pipe(switchMap(() => retryTransient(fetch)));

/**
 * A long-lived query like Firestore's `collectionData`/`docData`: fetches now, then again (debounced)
 * whenever a matching change event arrives. Must be called in an injection context.
 */
export function liveQuery<T>(scope: LiveScope, fetch: () => Observable<T>): Observable<T> {
  return live(inject(ChangeEventsService).changes(scope.spaceId), scope, fetch);
}

/** Same as `liveQuery`, for services that captured `ChangeEventsService` themselves. */
export function liveQueryWith<T>(events: ChangeEventsService, scope: LiveScope, fetch: () => Observable<T>): Observable<T> {
  return live(events.changes(scope.spaceId), scope, fetch);
}
