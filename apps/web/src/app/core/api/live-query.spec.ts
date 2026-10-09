import { defer, firstValueFrom, from, Subject } from 'rxjs';
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
});
