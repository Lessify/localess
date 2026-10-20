import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Locale, Page, SpaceLocale } from '@localess/shared';
import { SpaceLocaleService } from './space-locale.service';

describe('SpaceLocaleService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;
  const german: Locale = { id: 'de', name: 'German' };

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(SpaceLocaleService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it("findAll() reads one page of the space's locales, and again when the space changes", async () => {
    vi.useFakeTimers();
    const service = setup();
    const params = new HttpParams().set('page', 0).set('size', 20).set('search', 'ger');
    const results: Page<SpaceLocale>[] = [];
    const subscription = service.findAll('space-1', params).subscribe(it => results.push(it));
    const url = '/api/app/spaces/space-1/locales?page=0&size=20&search=ger';
    http.expectOne({ method: 'GET', url }).flush({ items: [], page: 0, size: 20, total: 0 });

    events.next({ spaceId: null, entity: 'spaces', id: 'space-1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(url).flush({ items: [{ localeId: 'de' } as SpaceLocale], page: 0, size: 20, total: 1 });
    expect(results.map(it => it.total)).toEqual([0, 1]);
    subscription.unsubscribe();
  });

  it('create() posts only the locale id to the space, and answers the space locale', async () => {
    const service = setup();
    const result = firstValueFrom(service.create('space-1', german));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/locales' });
    expect(request.request.body).toEqual({ localeId: 'de' });
    request.flush({ spaceId: 'space-1', localeId: 'de' });
    expect((await result).localeId).toBe('de');
  });

  it('move() posts the place the locale takes', async () => {
    const service = setup();
    const done = firstValueFrom(service.move('space-1', german, 0));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/locales/de/move' });
    expect(request.request.body).toEqual({ position: 0 });
    request.flush(null);
    await done;
  });

  it('remove() deletes the locale from the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('space-1', german));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/space-1/locales/de' }).flush(null);
    await done;
  });
});
