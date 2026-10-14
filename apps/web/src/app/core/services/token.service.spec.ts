import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Token, TokenType } from '@localess/shared';
import { TokenService } from './token.service';

const BASE = '/api/app/spaces/space-1/tokens';

describe('TokenService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(TokenService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads the space tokens', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll('space-1'));
    http.expectOne(BASE).flush([{ id: 't1' }]);
    expect(await result).toEqual([{ id: 't1' }]);
  });

  it('findAll() refetches when a token of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Token[][] = [];
    const subscription = service.findAll('space-1').subscribe(it => results.push(it));
    http.expectOne(BASE).flush([]);

    events.next({ spaceId: 'space-1', entity: 'webhooks', id: 'w', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(BASE);

    events.next({ spaceId: 'space-1', entity: 'tokens', id: 't1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(BASE).flush([{ id: 't1' } as Token]);
    expect(results).toEqual([[], [{ id: 't1' }]]);
    subscription.unsubscribe();
  });

  it('findFirst() limits the list to 1', async () => {
    const service = setup();
    const result = firstValueFrom(service.findFirst('space-1'));
    http.expectOne(`${BASE}?limit=1`).flush([{ id: 't1' }]);
    expect(await result).toEqual([{ id: 't1' }]);
  });

  it('firstValue() returns the value of the newest token of the first type', async () => {
    const service = setup();
    const result = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC, TokenType.PREVIEW]));
    http.expectOne(`${BASE}?type=public&limit=1`).flush([{ id: 't1', token: 'pub_x' }]);
    expect(await result).toBe('pub_x');
  });

  it('firstValue() falls back to the next type when the space has none of the first', async () => {
    const service = setup();
    const result = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC, TokenType.PREVIEW]));
    http.expectOne(`${BASE}?type=public&limit=1`).flush([]);
    http.expectOne(`${BASE}?type=preview&limit=1`).flush([{ id: 't2', token: 'prv_x' }]);
    expect(await result).toBe('prv_x');
  });

  it('firstValue() returns undefined when the space has none of the types', async () => {
    const service = setup();
    const result = firstValueFrom(service.firstValue('space-1', [TokenType.PREVIEW]));
    http.expectOne(`${BASE}?type=preview&limit=1`).flush([]);
    expect(await result).toBeUndefined();
  });

  it('firstValue() asks the server every time (no cache), so a regenerated token is picked up', async () => {
    const service = setup();
    const first = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC]));
    http.expectOne(`${BASE}?type=public&limit=1`).flush([{ id: 't1', token: 'pub_old' }]);
    expect(await first).toBe('pub_old');
    const second = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC]));
    http.expectOne(`${BASE}?type=public&limit=1`).flush([{ id: 't1', token: 'pub_new' }]);
    expect(await second).toBe('pub_new');
  });

  it('findById() reads one token', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 't1'));
    http.expectOne(`${BASE}/t1`).flush({ id: 't1' });
    expect(await result).toEqual({ id: 't1' });
  });

  it('create() posts name, type and cacheTtl (null when unset), returning the token', async () => {
    const service = setup();
    const result = firstValueFrom(service.create('space-1', { name: 'CDN', type: TokenType.PUBLIC }));
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual({ name: 'CDN', type: 'public', cacheTtl: null });
    request.flush({ id: 'secret' });
    expect((await result).id).toBe('secret');
  });

  it('update() puts the name and cacheTtl only (the type never changes)', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('space-1', 't1', { name: 'CDN', cacheTtl: 60 }));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/t1` });
    expect(request.request.body).toEqual({ name: 'CDN', cacheTtl: 60 });
    request.flush({});
    await done;
  });

  it('regenerate() posts to the regenerate endpoint and returns the new token', async () => {
    const service = setup();
    const result = firstValueFrom(service.regenerate('space-1', { id: 't1' } as Token));
    http.expectOne({ method: 'POST', url: `${BASE}/t1/regenerate` }).flush({ id: 't2' });
    expect((await result).id).toBe('t2');
  });

  it('delete() deletes the token', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', 't1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/t1` }).flush(null);
    await done;
  });
});
