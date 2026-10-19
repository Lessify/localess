import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { IdNameUrl, Page, SpaceEnvironment } from '@localess/shared';
import { SpaceEnvironmentService } from './space-environment.service';

describe('SpaceEnvironmentService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SpaceEnvironmentService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads one page with the given query, and again when that space changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const params = new HttpParams().set('page', 0).set('size', 20).set('search', 'prod');
    const results: Page<SpaceEnvironment>[] = [];
    const subscription = service.findAll('s1', params).subscribe(it => results.push(it));
    const url = '/api/app/spaces/s1/environments?page=0&size=20&search=prod';
    http.expectOne({ method: 'GET', url }).flush({ items: [], page: 0, size: 20, total: 0 });

    events.next({ spaceId: null, entity: 'spaces', id: 's2', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(url);

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(url).flush({ items: [{ id: 'e1', name: 'Prod' } as SpaceEnvironment], page: 0, size: 20, total: 1 });
    expect(results.map(it => it.total)).toEqual([0, 1]);
    subscription.unsubscribe();
  });

  it('findAllNames() reads every environment with its URL, and again when that space changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: IdNameUrl[][] = [];
    const subscription = service.findAllNames('s1').subscribe(it => results.push(it));
    const url = '/api/app/spaces/s1/environments/names';
    http.expectOne({ method: 'GET', url }).flush([]);

    events.next({ spaceId: null, entity: 'spaces', id: 's2', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(url);

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(url).flush([{ id: 'e1', name: 'Prod', url: 'https://prod.example.com/' }]);
    expect(results).toEqual([[], [{ id: 'e1', name: 'Prod', url: 'https://prod.example.com/' }]]);
    subscription.unsubscribe();
  });

  it('create() posts the name and URL, and answers the environment', async () => {
    const service = setup();
    const result = firstValueFrom(service.create('s1', { name: 'Prod', url: 'https://example.com' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/s1/environments' });
    expect(request.request.body).toEqual({ name: 'Prod', url: 'https://example.com' });
    request.flush({ id: 'e1', name: 'Prod' });
    expect((await result).id).toBe('e1');
  });

  it('update() patches one environment by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('s1', 'e1', { name: 'Prod', url: 'https://example.com' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/spaces/s1/environments/e1' });
    expect(request.request.body).toEqual({ name: 'Prod', url: 'https://example.com' });
    request.flush({});
    await done;
  });

  it('remove() deletes one environment by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('s1', 'e1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/s1/environments/e1' }).flush(null);
    await done;
  });

  it('reorder() puts the ids in their new order', async () => {
    const service = setup();
    const done = firstValueFrom(service.reorder('s1', ['e2', 'e1']));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/s1/environments/order' });
    expect(request.request.body).toEqual({ ids: ['e2', 'e1'] });
    request.flush(null);
    await done;
  });
});
