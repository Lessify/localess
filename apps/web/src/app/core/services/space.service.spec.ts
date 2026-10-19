import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { IdName, Page, Space } from '@localess/shared';
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

  it('findAll() reads one page with the given query, and again when a space changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const params = new HttpParams().set('page', 0).set('size', 10).set('search', 'mark');
    const results: Page<Space>[] = [];
    const subscription = service.findAll(params).subscribe(it => results.push(it));
    http.expectOne({ method: 'GET', url: '/api/app/spaces?page=0&size=10&search=mark' }).flush({ items: [], page: 0, size: 10, total: 0 });

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http
      .expectOne('/api/app/spaces?page=0&size=10&search=mark')
      .flush({ items: [{ id: 's1' } as Space], page: 0, size: 10, total: 1 });
    expect(results.map(it => it.total)).toEqual([0, 1]);
    subscription.unsubscribe();
  });

  it('findAllNames() reads the sidebar list, and again when a space changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: IdName[][] = [];
    const subscription = service.findAllNames().subscribe(it => results.push(it));
    http.expectOne({ method: 'GET', url: '/api/app/spaces/names' }).flush([{ id: 's1', name: 'Alpha' }]);

    events.next({ spaceId: null, entity: 'spaces', id: 's2', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/spaces/names').flush([{ id: 's1', name: 'Alpha' }, { id: 's2', name: 'Beta' }]);
    expect(results.map(it => it.length)).toEqual([1, 2]);
    subscription.unsubscribe();
  });

  it('findOne() reads one space', async () => {
    const service = setup();
    const result = firstValueFrom(service.findOne('s1'));
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
    const result = firstValueFrom(service.create({ name: 'Space 1', template: 'blog' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces' });
    expect(request.request.body).toEqual({ name: 'Space 1', template: 'blog' });
    request.flush({ id: 's1', name: 'Space 1' });
    expect((await result).id).toBe('s1');
  });

  it('findTemplates() reads the templates the user may create a space from', async () => {
    const service = setup();
    const result = firstValueFrom(service.findTemplates());
    http
      .expectOne({ method: 'GET', url: '/api/app/spaces/templates' })
      .flush(['blog', 'marketing']);
    expect(await result).toEqual(['blog', 'marketing']);
  });

  it('update() patches the name', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('s1', { name: 'Renamed' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/spaces/s1' });
    expect(request.request.body).toEqual({ name: 'Renamed' });
    request.flush({});
    await done;
  });

  it('setDefaultLocale() puts the locale id as the space default locale, and answers the space', async () => {
    const service = setup();
    const result = firstValueFrom(service.setDefaultLocale('s1', { id: 'de', name: 'German' }));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/s1/default-locale' });
    expect(request.request.body).toEqual({ id: 'de' });
    request.flush({ id: 's1', defaultLocaleId: 'de' });
    expect((await result).defaultLocaleId).toBe('de');
  });

  it('remove() deletes the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('s1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/s1' }).flush(null);
    await done;
  });

  it('findOverview() reads the computed overview and refetches when what it counts changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: unknown[] = [];
    const subscription = service.findOverview('s1').subscribe(it => results.push(it));
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
