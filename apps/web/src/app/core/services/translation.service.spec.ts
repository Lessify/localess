import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Translation } from '@localess/shared';
import { TranslationService } from './translation.service';

const BASE = '/api/app/spaces/space-1/translations';

describe('TranslationService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(TranslationService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads the space translations', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll('space-1'));
    http.expectOne(BASE).flush([{ id: 'hello' }]);
    expect(await result).toEqual([{ id: 'hello' }]);
  });

  it('findAll() refetches when a translation of the space changes, ignoring other entities', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Translation[][] = [];
    const subscription = service.findAll('space-1').subscribe(it => results.push(it));
    http.expectOne(BASE).flush([]);

    events.next({ spaceId: 'space-1', entity: 'schemas', id: 's', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(BASE);

    events.next({ spaceId: 'space-1', entity: 'translations', id: 'hello', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne(BASE).flush([{ id: 'hello' } as Translation]);
    expect(results).toEqual([[], [{ id: 'hello' }]]);
    subscription.unsubscribe();
  });

  it('countAll() maps the count response to a number', async () => {
    const service = setup();
    const result = firstValueFrom(service.countAll('space-1'));
    http.expectOne(`${BASE}/count`).flush({ count: 7 });
    expect(await result).toBe(7);
  });

  it('findById() reads one translation', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('space-1', 'hello'));
    http.expectOne(`${BASE}/hello`).flush({ id: 'hello' });
    expect(await result).toEqual({ id: 'hello' });
  });

  it('create() posts the translation with its values as they are, dropping empty labels/description', async () => {
    const service = setup();
    const bare = firstValueFrom(service.create('space-1', { key: 'quote', locales: { en: 'Say "hi"' }, labels: [], description: '' }));
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual({ key: 'quote', locales: { en: 'Say "hi"' } });
    request.flush({});
    await bare;

    const full = firstValueFrom(service.create('space-1', { key: 'list', locales: { en: 'A' }, labels: ['x'], description: 'd' }));
    const fullRequest = http.expectOne({ method: 'POST', url: BASE });
    expect(fullRequest.request.body).toEqual({ key: 'list', locales: { en: 'A' }, labels: ['x'], description: 'd' });
    fullRequest.flush({});
    await full;
  });

  it('update() patches labels and description', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('space-1', 'hello', { labels: ['a'], description: 'desc' }));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/hello` });
    expect(request.request.body).toEqual({ labels: ['a'], description: 'desc' });
    request.flush({});
    await done;
  });

  it('updateKey() renames on the server, addressing the translation by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateKey('space-1', { id: 'uuid-1', key: 'old' } as Translation, 'new'));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/uuid-1/key` });
    expect(request.request.body).toEqual({ key: 'new' });
    request.flush({});
    await done;
  });

  it('updateLocale() puts one locale value', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateLocale('space-1', 'hello', 'de', 'Hallo'));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/hello/locales/de` });
    expect(request.request.body).toEqual({ value: 'Hallo' });
    request.flush({});
    await done;
  });

  it('delete() and deleteAll() delete one or all translations', async () => {
    const service = setup();
    const one = firstValueFrom(service.delete('space-1', 'hello'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/hello` }).flush(null);
    await one;

    const all = firstValueFrom(service.deleteAll('space-1'));
    http.expectOne({ method: 'DELETE', url: BASE }).flush(null);
    await all;
  });

  it('publish() posts to the publish endpoint', async () => {
    const service = setup();
    const done = firstValueFrom(service.publish('space-1'));
    http.expectOne({ method: 'POST', url: `${BASE}/publish` }).flush(null);
    await done;
  });

  it('translateLocale() posts source, target and overwrite (default false)', async () => {
    const service = setup();
    const done = firstValueFrom(service.translateLocale('space-1', 'en', 'de'));
    const request = http.expectOne({ method: 'POST', url: `${BASE}/translate-locale` });
    expect(request.request.body).toEqual({ sourceLocaleId: 'en', targetLocaleId: 'de', overwrite: false });
    request.flush({});
    await done;
  });
});
