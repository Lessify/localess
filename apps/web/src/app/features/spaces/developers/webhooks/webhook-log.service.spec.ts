import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { Page, WebhookLog } from '@localess/shared';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { WebhookLogService } from './webhook-log.service';

describe('WebhookLogService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;
  const base = '/api/app/spaces/space-1/webhooks';

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(WebhookLogService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads one page of the logs with the query', async () => {
    const service = setup();
    const page = { items: [{ id: '1' }], page: 0, size: 20, total: 1 };
    const result = firstValueFrom(service.findAll('space-1', 'w1', new HttpParams().set('page', 0).append('status', 'FAILURE')));
    http.expectOne({ method: 'GET', url: `${base}/w1/logs?page=0&status=FAILURE` }).flush(page);
    expect(await result).toEqual(page);
  });

  it('findAll() refetches on new logs of that webhook only', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Page<WebhookLog>[] = [];
    const empty = { items: [], page: 0, size: 20, total: 0 };
    const one = { items: [{ id: '1' } as WebhookLog], page: 0, size: 20, total: 1 };
    const subscription = service.findAll('space-1', 'w1', new HttpParams()).subscribe(it => results.push(it));
    http.expectOne(`${base}/w1/logs`).flush(empty);

    events.next({ spaceId: 'space-1', entity: 'webhook_logs', id: 'w2', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(`${base}/w1/logs`);

    events.next({ spaceId: 'space-1', entity: 'webhook_logs', id: 'w1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(`${base}/w1/logs`).flush(one);
    expect(results).toEqual([empty, one]);
    subscription.unsubscribe();
  });
});
