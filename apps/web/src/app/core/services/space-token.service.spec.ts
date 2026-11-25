import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Page, Token, TokenType } from '@localess/shared';
import { SpaceTokenService } from './space-token.service';

const BASE = '/api/app/spaces/space-1/tokens';

/** A page of these tokens, as the server answers. */
const pageOf = (items: Partial<Token>[]): Page<Partial<Token>> => ({ items, page: 0, size: 20, total: items.length });

describe('SpaceTokenService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SpaceTokenService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads one page with the list params', async () => {
    const service = setup();
    const params = new HttpParams().set('page', 1).set('size', 10).set('sort', 'name').set('direction', 'asc').set('search', 'web');
    const result = firstValueFrom(service.findAll('space-1', params));
    http.expectOne(`${BASE}?page=1&size=10&sort=name&direction=asc&search=web`).flush(pageOf([{ id: 't1' }]));
    expect((await result).items).toEqual([{ id: 't1' }]);
  });

  it('findAll() refetches when a token of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Page<Token>['items'][] = [];
    const subscription = service.findAll('space-1', new HttpParams()).subscribe(it => results.push(it.items));
    http.expectOne(BASE).flush(pageOf([]));

    events.next({ spaceId: 'space-1', entity: 'webhooks', id: 'w', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(BASE);

    events.next({ spaceId: 'space-1', entity: 'tokens', id: 't1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(BASE).flush(pageOf([{ id: 't1' }]));
    expect(results).toEqual([[], [{ id: 't1' }]]);
    subscription.unsubscribe();
  });

  it('firstValue() returns the value of the newest token of the first type', async () => {
    const service = setup();
    const result = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC, TokenType.PREVIEW]));
    http.expectOne(`${BASE}?type=public&size=1`).flush(pageOf([{ id: 't1', token: 'pub_x' }]));
    expect(await result).toBe('pub_x');
  });

  it('firstValue() falls back to the next type when the space has none of the first', async () => {
    const service = setup();
    const result = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC, TokenType.PREVIEW]));
    http.expectOne(`${BASE}?type=public&size=1`).flush(pageOf([]));
    http.expectOne(`${BASE}?type=preview&size=1`).flush(pageOf([{ id: 't2', token: 'prv_x' }]));
    expect(await result).toBe('prv_x');
  });

  it('firstValue() returns undefined when the space has none of the types', async () => {
    const service = setup();
    const result = firstValueFrom(service.firstValue('space-1', [TokenType.PREVIEW]));
    http.expectOne(`${BASE}?type=preview&size=1`).flush(pageOf([]));
    expect(await result).toBeUndefined();
  });

  it('firstValue() asks the server every time (no cache), so a regenerated token is picked up', async () => {
    const service = setup();
    const first = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC]));
    http.expectOne(`${BASE}?type=public&size=1`).flush(pageOf([{ id: 't1', token: 'pub_old' }]));
    expect(await first).toBe('pub_old');
    const second = firstValueFrom(service.firstValue('space-1', [TokenType.PUBLIC]));
    http.expectOne(`${BASE}?type=public&size=1`).flush(pageOf([{ id: 't1', token: 'pub_new' }]));
    expect(await second).toBe('pub_new');
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

  it('remove() deletes the token', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', 't1'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/t1` }).flush(null);
    await done;
  });
});
