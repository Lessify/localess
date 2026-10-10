import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { Locale } from '@localess/shared';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let http: HttpTestingController;
  const entity: Locale = { id: 'de', name: 'German' };

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(LocaleService);
  }

  afterEach(() => {
    http.verify();
  });

  it('setDefault() puts the locale id as the space default locale', async () => {
    const service = setup();
    const done = firstValueFrom(service.setDefault('space-1', entity));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/default-locale' });
    expect(request.request.body).toEqual({ id: 'de' });
    request.flush({});
    await done;
  });

  it('create() posts only the locale id to the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.create('space-1', entity));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/locales' });
    expect(request.request.body).toEqual({ id: 'de' });
    request.flush({});
    await done;
  });

  it('reorder() puts the locale ids in their new order', async () => {
    const service = setup();
    const done = firstValueFrom(service.reorder('space-1', ['de', 'en']));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/locales/order' });
    expect(request.request.body).toEqual({ ids: ['de', 'en'] });
    request.flush({});
    await done;
  });

  it('delete() deletes the locale from the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', entity));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/space-1/locales/de' }).flush({});
    await done;
  });

  it('findAllLocales() reads the locale list from the server', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAllLocales());
    http.expectOne({ method: 'GET', url: '/api/app/locales' }).flush([{ id: 'en', name: 'English' }]);
    expect(await result).toEqual([{ id: 'en', name: 'English' }]);
  });

  it('isLocaleTranslatableFrom() reflects the source-support set', () => {
    const service = setup();
    expect(service.isLocaleTranslatableFrom('de')).toBe(true);
    expect(service.isLocaleTranslatableFrom('not-a-real-locale')).toBe(false);
  });

  it('isLocaleTranslatableTo() reflects the target-support set', () => {
    const service = setup();
    expect(service.isLocaleTranslatableTo('de')).toBe(true);
    expect(service.isLocaleTranslatableTo('not-a-real-locale')).toBe(false);
  });
});
