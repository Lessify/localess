import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { Page, WebHookEvent, WebHookLog } from '@localess/shared';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { WebHookService } from './webhook.service';

describe('WebHookService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;
  const base = '/api/app/spaces/space-1/webhooks';

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(WebHookService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads one page of the space webhooks with the query', async () => {
    const service = setup();
    const page = { items: [{ id: 'w1' }], page: 1, size: 10, total: 11 };
    const result = firstValueFrom(
      service.findAll('space-1', new HttpParams().set('page', 1).set('size', 10).append('event', 'content.published')),
    );
    http.expectOne({ method: 'GET', url: `${base}?page=1&size=10&event=content.published` }).flush(page);
    expect(await result).toEqual(page);
  });

  it('findById() reads one webhook', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 'w1'));
    http.expectOne({ method: 'GET', url: `${base}/w1` }).flush({ id: 'w1' });
    expect(await result).toEqual({ id: 'w1' });
  });

  it('create() posts the webhook, leaving out empty headers and secret, and returns its id', async () => {
    const service = setup();
    const result = firstValueFrom(
      service.create('space-1', { name: 'Hook', url: 'https://example.com', events: [WebHookEvent.CONTENT_PUBLISHED], secret: '' }),
    );
    const request = http.expectOne({ method: 'POST', url: base });
    expect(request.request.body).toEqual({ name: 'Hook', url: 'https://example.com', events: ['content.published'] });
    request.flush({ id: 'w1', name: 'Hook' });
    expect(await result).toBe('w1');
  });

  it('update() puts the webhook with headers and secret when given', async () => {
    const service = setup();
    const entity = {
      name: 'Hook',
      url: 'https://example.com',
      events: [WebHookEvent.CONTENT_CHANGED],
      headers: { 'X-Key': 'v' },
      secret: 'shh',
    };
    const done = firstValueFrom(service.update('space-1', 'w1', entity));
    const request = http.expectOne({ method: 'PUT', url: `${base}/w1` });
    expect(request.request.body).toEqual({ ...entity, events: ['content.changed'] });
    request.flush({});
    await done;
  });

  it('updateStatus() patches enabled', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateStatus('space-1', 'w1', false));
    const request = http.expectOne({ method: 'PATCH', url: `${base}/w1/status` });
    expect(request.request.body).toEqual({ enabled: false });
    request.flush({});
    await done;
  });

  it('delete() deletes the webhook', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', 'w1'));
    http.expectOne({ method: 'DELETE', url: `${base}/w1` }).flush(null);
    await done;
  });

  it('findLogs() reads one page of the logs with the query', async () => {
    const service = setup();
    const page = { items: [{ id: '1' }], page: 0, size: 20, total: 1 };
    const result = firstValueFrom(service.findLogs('space-1', 'w1', new HttpParams().set('page', 0).append('status', 'FAILURE')));
    http.expectOne({ method: 'GET', url: `${base}/w1/logs?page=0&status=FAILURE` }).flush(page);
    expect(await result).toEqual(page);
  });

  it('findLogs() refetches on new logs of that webhook only', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Page<WebHookLog>[] = [];
    const empty = { items: [], page: 0, size: 20, total: 0 };
    const one = { items: [{ id: '1' } as WebHookLog], page: 0, size: 20, total: 1 };
    const subscription = service.findLogs('space-1', 'w1', new HttpParams()).subscribe(it => results.push(it));
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
