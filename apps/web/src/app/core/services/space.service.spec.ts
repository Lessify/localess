import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Page, Space } from '@localess/shared';
import { SpaceService } from './space.service';

describe('SpaceService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SpaceService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findPage() reads one page with the given query, and again when a space changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const params = new HttpParams().set('page', 0).set('size', 10).set('search', 'mark');
    const results: Page<Space>[] = [];
    const subscription = service.findPage(params).subscribe(it => results.push(it));
    http.expectOne({ method: 'GET', url: '/api/app/spaces?page=0&size=10&search=mark' }).flush({ items: [], page: 0, size: 10, total: 0 });

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http
      .expectOne('/api/app/spaces?page=0&size=10&search=mark')
      .flush({ items: [{ id: 's1' } as Space], page: 0, size: 10, total: 1 });
    expect(results.map(it => it.total)).toEqual([0, 1]);
    subscription.unsubscribe();
  });

  it('findAllPages() loads every space the user can open, 100 at a time, by name, without imports', async () => {
    const service = setup();
    const spaces = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${from + i}` }) as Space);
    const result = firstValueFrom(service.findAllPages());
    const url = (page: number) => `/api/app/spaces?page=${page}&size=100&sort=name&direction=asc&importing=false`;
    http.expectOne(url(0)).flush({ items: spaces(0, 100), page: 0, size: 100, total: 250 });
    http.expectOne(url(1)).flush({ items: spaces(100, 100), page: 1, size: 100, total: 250 });
    http.expectOne(url(2)).flush({ items: spaces(200, 50), page: 2, size: 100, total: 250 });
    http.expectNone(url(3));
    const all = await result;
    expect(all).toHaveLength(250);
    expect(all.at(-1)?.id).toBe('s249');
  });

  it('findAllPages() stops after one request when everything fits on the first page', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAllPages());
    http
      .expectOne('/api/app/spaces?page=0&size=100&sort=name&direction=asc&importing=false')
      .flush({ items: [{ id: 's1' } as Space], page: 0, size: 100, total: 1 });
    expect(await result).toEqual([{ id: 's1' }]);
  });

  it('findById() reads one space', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('s1'));
    http.expectOne({ method: 'GET', url: '/api/app/spaces/s1' }).flush({ id: 's1' });
    expect(await result).toEqual({ id: 's1' });
  });

  it('create() posts the name and returns the created space', async () => {
    const service = setup();
    const result = firstValueFrom(service.create({ name: 'Space 1' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces' });
    expect(request.request.body).toEqual({ name: 'Space 1' });
    request.flush({ id: 's1', name: 'Space 1' });
    expect((await result).id).toBe('s1');
  });

  it('create() sends the chosen template with the name', async () => {
    const service = setup();
    const result = firstValueFrom(service.create({ name: 'Space 1', template: 'BLOG' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces' });
    expect(request.request.body).toEqual({ name: 'Space 1', template: 'BLOG' });
    request.flush({ id: 's1', name: 'Space 1' });
    expect((await result).id).toBe('s1');
  });

  it('templates() reads the templates the user may create a space from', async () => {
    const service = setup();
    const result = firstValueFrom(service.templates());
    http
      .expectOne({ method: 'GET', url: '/api/app/spaces/templates' })
      .flush(['BLOG', 'MARKETING']);
    expect(await result).toEqual(['BLOG', 'MARKETING']);
  });

  it('update() patches the name', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('s1', { name: 'Renamed' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/spaces/s1' });
    expect(request.request.body).toEqual({ name: 'Renamed' });
    request.flush({});
    await done;
  });

  it('createEnvironment() posts the name and URL', async () => {
    const service = setup();
    const done = firstValueFrom(service.createEnvironment('s1', { name: 'Prod', url: 'https://example.com' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/s1/environments' });
    expect(request.request.body).toEqual({ name: 'Prod', url: 'https://example.com' });
    request.flush({});
    await done;
  });

  it('updateEnvironment() patches one environment by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateEnvironment('s1', 'e1', { name: 'Prod', url: 'https://example.com' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/spaces/s1/environments/e1' });
    expect(request.request.body).toEqual({ name: 'Prod', url: 'https://example.com' });
    request.flush({});
    await done;
  });

  it('deleteEnvironment() deletes one environment by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.deleteEnvironment('s1', 'e1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/s1/environments/e1' }).flush({});
    await done;
  });

  it('reorderEnvironments() puts the ids in their new order', async () => {
    const service = setup();
    const done = firstValueFrom(service.reorderEnvironments('s1', ['e2', 'e1']));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/s1/environments/order' });
    expect(request.request.body).toEqual({ ids: ['e2', 'e1'] });
    request.flush({});
    await done;
  });

  it('delete() deletes the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('s1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/s1' }).flush(null);
    await done;
  });

  it('overview() reads the computed overview and refetches when what it counts changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: unknown[] = [];
    const subscription = service.overview('s1').subscribe(it => results.push(it));
    http.expectOne({ method: 'GET', url: '/api/app/spaces/s1/overview' }).flush({ counts: { assets: 1 } });

    events.next({ spaceId: 's1', entity: 'webhooks', id: 'w', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone('/api/app/spaces/s1/overview');

    for (const entity of ['translations', 'assets', 'contents', 'schemas']) {
      events.next({ spaceId: 's1', entity, id: 'x', op: 'created' });
      await vi.advanceTimersByTimeAsync(200);
      http.expectOne('/api/app/spaces/s1/overview').flush({ counts: { assets: 1 } });
    }
    // A locale added or removed arrives as a change of the space.
    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/spaces/s1/overview').flush({ counts: { assets: 2 } });

    expect(results).toHaveLength(6);
    subscription.unsubscribe();
  });
});
