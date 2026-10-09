import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Token, TokenPermission } from '@localess/shared';
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

  it('findFirstByPermission() filters by permission and limits to 1', async () => {
    const service = setup();
    const result = firstValueFrom(service.findFirstByPermission('space-1', TokenPermission.CONTENT_PUBLIC));
    http.expectOne(`${BASE}?permission=${TokenPermission.CONTENT_PUBLIC}&limit=1`).flush([]);
    expect(await result).toEqual([]);
  });

  it('findById() reads one token', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 't1'));
    http.expectOne(`${BASE}/t1`).flush({ id: 't1' });
    expect(await result).toEqual({ id: 't1' });
  });

  it('create() posts name, permissions and cacheTtl (null when unset), returning the token', async () => {
    const service = setup();
    const result = firstValueFrom(service.create('space-1', { name: 'CDN', permissions: [TokenPermission.CONTENT_PUBLIC] }));
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual({ name: 'CDN', permissions: [TokenPermission.CONTENT_PUBLIC], cacheTtl: null });
    request.flush({ id: 'secret' });
    expect((await result).id).toBe('secret');
  });

  it('update() puts the same body', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('space-1', 't1', { name: 'CDN', permissions: [], cacheTtl: 60 }));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/t1` });
    expect(request.request.body).toEqual({ name: 'CDN', permissions: [], cacheTtl: 60 });
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
