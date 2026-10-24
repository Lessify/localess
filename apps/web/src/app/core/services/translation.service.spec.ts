import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Page, Translation, TranslationNode } from '@localess/shared';
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

  const page = (items: Translation[], total = items.length): Page<Translation> => ({ items, page: 0, size: 50, total });
  const params = new HttpParams().set('page', 0).set('size', 50).set('search', 'home');

  it('findAll() reads one page with the given query, once', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll('space-1', params));
    http.expectOne(`${BASE}?page=0&size=50&search=home`).flush(page([{ id: 'hello' } as Translation]));
    expect(await result).toEqual(page([{ id: 'hello' } as Translation]));
  });

  it('findNodes() reads one level of the tree once', async () => {
    const service = setup();
    const result = firstValueFrom(service.findNodes('space-1', new HttpParams().set('parent', 'home')));
    const nodes: Page<TranslationNode> = { items: [{ name: 'title', path: 'home.title', children: 0 }], page: 0, size: 100, total: 1 };
    http.expectOne(`${BASE}/nodes?parent=home`).flush(nodes);
    expect(await result).toEqual(nodes);
  });

  it('findLabels() reads the labels of the space', async () => {
    const service = setup();
    const result = firstValueFrom(service.findLabels('space-1'));
    http.expectOne(`${BASE}/labels`).flush(['cta', 'form']);
    expect(await result).toEqual(['cta', 'form']);
  });

  it('isKeyTaken() asks for that exact key, one row at most', async () => {
    const service = setup();
    const taken = firstValueFrom(service.isKeyTaken('space-1', 'home.title'));
    http.expectOne(`${BASE}?key=home.title&size=1`).flush(page([{ id: 'x' } as Translation]));
    expect(await taken).toBe(true);

    const free = firstValueFrom(service.isKeyTaken('space-1', 'home.new'));
    http.expectOne(`${BASE}?key=home.new&size=1`).flush(page([], 0));
    expect(await free).toBe(false);
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

  it('rename() renames on the server, addressing the translation by id', async () => {
    const service = setup();
    const done = firstValueFrom(service.rename('space-1', { id: 'uuid-1', key: 'old' } as Translation, 'new'));
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

  it('remove() and removeAll() delete one or all translations', async () => {
    const service = setup();
    const one = firstValueFrom(service.remove('space-1', 'hello'));
    http.expectOne({ method: 'DELETE', url: `${BASE}/hello` }).flush(null);
    await one;

    const all = firstValueFrom(service.removeAll('space-1'));
    http.expectOne({ method: 'DELETE', url: BASE }).flush(null);
    await all;
  });

  it('publish() posts to the publish endpoint', async () => {
    const service = setup();
    const done = firstValueFrom(service.publish('space-1'));
    http.expectOne({ method: 'POST', url: `${BASE}/publish` }).flush(null);
    await done;
  });

  it('exportLocaleUrl() is the key-value download of one locale (no request: saveAs opens it)', () => {
    const service = setup();
    expect(service.exportLocaleUrl('space-1', 'de')).toBe(`${BASE}/export/de`);
  });
});
