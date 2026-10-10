import { HttpErrorResponse } from '@angular/common/http';
import { defer, firstValueFrom, from, Observable, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChangeEvent, ChangeEventsService, RESYNC_EVENT } from './change-events.service';
import { liveQueryWith } from './live-query';

describe('liveQueryWith', () => {
  afterEach(() => vi.useRealTimers());

  function setup() {
    const events = new Subject<ChangeEvent>();
    const service = { changes: vi.fn(() => events) } as unknown as ChangeEventsService;
    let count = 0;
    const fetch = () => defer(() => from(Promise.resolve(++count)));
    return { events, service, fetch };
  }

  it('fetches immediately', async () => {
    const { service, fetch } = setup();
    expect(await firstValueFrom(liveQueryWith(service, { entities: ['contents'] }, fetch))).toBe(1);
  });

  it('refetches (debounced) on matching events and on resync, ignoring other entities and ids', async () => {
    vi.useFakeTimers();
    const { events, service, fetch } = setup();
    const values: number[] = [];
    const subscription = liveQueryWith(service, { spaceId: 's1', entities: ['contents'], id: 'c1' }, fetch).subscribe(it =>
      values.push(it),
    );
    await vi.advanceTimersByTimeAsync(0);

    events.next({ spaceId: 's1', entity: 'schemas', op: 'updated' });
    events.next({ spaceId: 's1', entity: 'contents', id: 'other', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    expect(values).toEqual([1]);

    events.next({ spaceId: 's1', entity: 'contents', id: 'c1', op: 'updated' });
    events.next({ spaceId: 's1', entity: 'contents', id: 'c1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    expect(values).toEqual([1, 2]);

    events.next(RESYNC_EVENT);
    await vi.advanceTimersByTimeAsync(200);
    expect(values).toEqual([1, 2, 3]);
    expect(service.changes).toHaveBeenCalledWith('s1');
    subscription.unsubscribe();
  });

  it('treats events without an id (bulk changes) as matching a detail query', async () => {
    vi.useFakeTimers();
    const { events, service, fetch } = setup();
    const values: number[] = [];
    const subscription = liveQueryWith(service, { spaceId: 's1', entities: ['contents'], id: 'c1' }, fetch).subscribe(it =>
      values.push(it),
    );
    await vi.advanceTimersByTimeAsync(0);
    events.next({ spaceId: 's1', entity: 'contents', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    expect(values).toEqual([1, 2]);
    subscription.unsubscribe();
  });

  describe('transient failures', () => {
    /** A fetch answering the scripted results in order: a number, or an HTTP status to fail with. */
    function scripted(results: number[]) {
      const calls: number[] = [];
      const fetch = (): Observable<number> =>
        defer(() => {
          const next = results.shift() ?? -1;
          calls.push(next);
          return next >= 400 || next === 0 ? throwError(() => new HttpErrorResponse({ status: next })) : from(Promise.resolve(next));
        });
      return { fetch, calls };
    }

    function subscribe(service: ChangeEventsService, fetch: () => Observable<number>) {
      const values: number[] = [];
      const errors: unknown[] = [];
      const subscription = liveQueryWith(service, { spaceId: 's1', entities: ['contents'] }, fetch).subscribe({
        next: it => values.push(it),
        error: err => errors.push(err),
      });
      return { values, errors, subscription };
    }

    it('retries a refetch failing with 503 (server restarting) with backoff, and keeps listening', async () => {
      vi.useFakeTimers();
      const { events, service } = setup();
      const { fetch, calls } = scripted([1, 503, 0, 2, 3]);
      const { values, errors, subscription } = subscribe(service, fetch);
      await vi.advanceTimersByTimeAsync(0);

      events.next(RESYNC_EVENT);
      await vi.advanceTimersByTimeAsync(100); // debounce → 503
      await vi.advanceTimersByTimeAsync(1000); // 1 s → network error (status 0)
      expect(values).toEqual([1]);
      await vi.advanceTimersByTimeAsync(2000); // 2 s → 2
      expect(values).toEqual([1, 2]);
      expect(errors).toEqual([]);

      events.next({ spaceId: 's1', entity: 'contents', op: 'updated' });
      await vi.advanceTimersByTimeAsync(200);
      expect(values).toEqual([1, 2, 3]);
      expect(calls).toEqual([1, 503, 0, 2, 3]);
      subscription.unsubscribe();
    });

    it('retries the first fetch too', async () => {
      vi.useFakeTimers();
      const { service } = setup();
      const { fetch } = scripted([502, 1]);
      const { values, errors, subscription } = subscribe(service, fetch);
      await vi.advanceTimersByTimeAsync(1000);
      expect(values).toEqual([1]);
      expect(errors).toEqual([]);
      subscription.unsubscribe();
    });

    it('caps the backoff at 30 s', async () => {
      vi.useFakeTimers();
      const { service } = setup();
      const { fetch, calls } = scripted([504, 504, 504, 504, 504, 504, 504, 1]);
      const { values, subscription } = subscribe(service, fetch);
      await vi.advanceTimersByTimeAsync(1000 + 2000 + 4000 + 8000 + 16000 + 30000);
      expect(calls).toHaveLength(7);
      await vi.advanceTimersByTimeAsync(30000);
      expect(values).toEqual([1]);
      subscription.unsubscribe();
    });

    it('passes real errors (404) through, as before', async () => {
      vi.useFakeTimers();
      const { service } = setup();
      const { fetch } = scripted([404]);
      const { errors, subscription } = subscribe(service, fetch);
      await vi.advanceTimersByTimeAsync(0);
      expect(errors).toHaveLength(1);
      expect((errors[0] as HttpErrorResponse).status).toBe(404);
      subscription.unsubscribe();
    });

    it('refetches at once when a change event arrives during the backoff', async () => {
      vi.useFakeTimers();
      const { events, service } = setup();
      const { fetch, calls } = scripted([1, 503, 2]);
      const { values, subscription } = subscribe(service, fetch);
      await vi.advanceTimersByTimeAsync(0);

      events.next(RESYNC_EVENT);
      await vi.advanceTimersByTimeAsync(100); // → 503, retry scheduled in 1 s
      events.next({ spaceId: 's1', entity: 'contents', op: 'updated' });
      await vi.advanceTimersByTimeAsync(100); // debounce → refetch now, not after the backoff
      expect(values).toEqual([1, 2]);
      expect(calls).toEqual([1, 503, 2]);
      subscription.unsubscribe();
    });
  });
});
