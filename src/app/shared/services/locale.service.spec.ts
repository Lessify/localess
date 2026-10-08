import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { Locale } from '../models/locale.model';
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

  it('markAsFallback() puts the locale id as the space fallback', async () => {
    const service = setup();
    const done = firstValueFrom(service.markAsFallback('space-1', entity));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/spaces/space-1/locale-fallback' });
    expect(request.request.body).toEqual({ id: 'de' });
    request.flush({});
    await done;
  });

  it('create() posts the locale to the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.create('space-1', entity));
    const request = http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/locales' });
    expect(request.request.body).toEqual({ id: 'de', name: 'German' });
    request.flush({});
    await done;
  });

  it('delete() deletes the locale from the space', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('space-1', entity));
    http.expectOne({ method: 'DELETE', url: '/api/app/spaces/space-1/locales/de' }).flush({});
    await done;
  });

  it('findAllLocales() returns the static locale list without a request', async () => {
    const service = setup();
    const result = await firstValueFrom(service.findAllLocales());
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContainEqual({ id: 'en', name: 'English' });
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
