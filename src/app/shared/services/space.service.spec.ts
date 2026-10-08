import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Space } from '../models/space.model';
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

  it('findAll() reads the spaces', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll());
    http.expectOne({ method: 'GET', url: '/api/app/spaces' }).flush([{ id: 's1', name: 'Space 1' }]);
    expect(await result).toEqual([{ id: 's1', name: 'Space 1' }]);
  });

  it('findAll() refetches when a space changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Space[][] = [];
    const subscription = service.findAll().subscribe(it => results.push(it));
    http.expectOne('/api/app/spaces').flush([]);

    events.next({ spaceId: null, entity: 'users', id: 'u', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone('/api/app/spaces');

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/spaces').flush([{ id: 's1' } as Space]);
    expect(results).toEqual([[], [{ id: 's1' }]]);
    subscription.unsubscribe();
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

  it('update() patches the name', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('s1', { name: 'Renamed' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/spaces/s1' });
    expect(request.request.body).toEqual({ name: 'Renamed' });
    request.flush({});
    await done;
  });

  it('updateEnvironments() patches the environments', async () => {
    const service = setup();
    const environments = [{ name: 'Prod', url: 'https://example.com' }];
    const done = firstValueFrom(service.updateEnvironments('s1', environments));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/spaces/s1' });
    expect(request.request.body).toEqual({ environments });
    request.flush({});
    await done;
  });

  it('delete() deletes the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('s1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/s1' }).flush(null);
    await done;
  });

  it('calculateOverview() posts to the overview endpoint', async () => {
    const service = setup();
    const done = firstValueFrom(service.calculateOverview('s1'));
    http.expectOne({ method: 'POST', url: '/api/app/spaces/s1/overview' }).flush({});
    await done;
  });
});
