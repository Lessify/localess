import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Translation, TranslationType } from '../models/translation.model';
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

  it('create() posts the translation, wrapping locale values by type and dropping empty labels/description', async () => {
    const service = setup();
    const plural = firstValueFrom(
      service.create('space-1', { id: 'items', type: TranslationType.PLURAL, locales: { en: 'Item' }, labels: [], description: '' }),
    );
    const request = http.expectOne({ method: 'POST', url: BASE });
    expect(request.request.body).toEqual({ id: 'items', type: 'PLURAL', locales: { en: '{"0":"Item"}' } });
    request.flush({});
    await plural;

    const array = firstValueFrom(
      service.create('space-1', { id: 'list', type: TranslationType.ARRAY, locales: { en: 'A' }, labels: ['x'], description: 'd' }),
    );
    const arrayRequest = http.expectOne({ method: 'POST', url: BASE });
    expect(arrayRequest.request.body).toEqual({ id: 'list', type: 'ARRAY', locales: { en: '["A"]' }, labels: ['x'], description: 'd' });
    arrayRequest.flush({});
    await array;
  });

  it('update() patches labels and description', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('space-1', 'hello', { labels: ['a'], description: 'desc' }));
    const request = http.expectOne({ method: 'PATCH', url: `${BASE}/hello` });
    expect(request.request.body).toEqual({ labels: ['a'], description: 'desc' });
    request.flush({});
    await done;
  });

  it('updateId() renames on the server', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateId('space-1', { id: 'old' } as Translation, 'new'));
    const request = http.expectOne({ method: 'PUT', url: `${BASE}/old/id` });
    expect(request.request.body).toEqual({ id: 'new' });
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
