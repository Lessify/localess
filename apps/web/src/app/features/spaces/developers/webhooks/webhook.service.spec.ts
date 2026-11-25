import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { WebhookEvent } from '@localess/shared';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;
  const base = '/api/app/spaces/space-1/webhooks';

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(WebhookService);
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

  it('findOne() reads one webhook', async () => {
    const service = setup();
    const result = firstValueFrom(service.findOne('space-1', 'w1'));
    http.expectOne({ method: 'GET', url: `${base}/w1` }).flush({ id: 'w1' });
    expect(await result).toEqual({ id: 'w1' });
  });

  it('create() posts the webhook, leaving out empty headers, and answers it (signed: with its secret)', async () => {
    const service = setup();
    const entity = { name: 'Hook', url: 'https://example.com', events: [WebhookEvent.CONTENT_PUBLISHED] };
    const plain = firstValueFrom(service.create('space-1', { ...entity, signed: false }));
    const plainRequest = http.expectOne({ method: 'POST', url: base });
    expect(plainRequest.request.body).toEqual({ ...entity, events: ['content.published'] });
    plainRequest.flush({ id: 'w1', name: 'Hook', hasSecret: false });
    expect(await plain).toEqual({ id: 'w1', name: 'Hook', hasSecret: false });

    const signed = firstValueFrom(service.create('space-1', { ...entity, signed: true }));
    const signedRequest = http.expectOne({ method: 'POST', url: base });
    expect(signedRequest.request.body).toEqual({ ...entity, events: ['content.published'], signed: true });
    signedRequest.flush({ id: 'w2', hasSecret: true, secret: 'whsec_x' });
    expect(await signed).toMatchObject({ secret: 'whsec_x' });
  });

  it('update() puts the webhook with its headers (null keeps a value) when given', async () => {
    const service = setup();
    const entity = {
      name: 'Hook',
      url: 'https://example.com',
      events: [WebhookEvent.CONTENT_CHANGED],
      headers: { 'X-Key': 'v', Authorization: null },
    };
    const done = firstValueFrom(service.update('space-1', 'w1', entity));
    const request = http.expectOne({ method: 'PUT', url: `${base}/w1` });
    expect(request.request.body).toEqual(entity);
    request.flush({});
    await done;
  });

  it('createSecret() posts for a new secret and answers it; removeSecret() deletes it', async () => {
    const service = setup();
    const created = firstValueFrom(service.createSecret('space-1', 'w1'));
    http.expectOne({ method: 'POST', url: `${base}/w1/secret` }).flush({ id: 'w1', hasSecret: true, secret: 'whsec_y' });
    expect(await created).toMatchObject({ secret: 'whsec_y' });

    const removed = firstValueFrom(service.removeSecret('space-1', 'w1'));
    http.expectOne({ method: 'DELETE', url: `${base}/w1/secret` }).flush(null);
    await removed;
  });

  it('updateStatus() patches enabled', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateStatus('space-1', 'w1', false));
    const request = http.expectOne({ method: 'PATCH', url: `${base}/w1/status` });
    expect(request.request.body).toEqual({ enabled: false });
    request.flush({});
    await done;
  });

  it('remove() deletes the webhook', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', 'w1'));
    http.expectOne({ method: 'DELETE', url: `${base}/w1` }).flush(null);
    await done;
  });
});
