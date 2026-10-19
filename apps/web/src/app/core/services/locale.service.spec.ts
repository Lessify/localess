import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(LocaleService);
  }

  afterEach(() => {
    http.verify();
  });

  it('findAll() reads the locale list from the server', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll());
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
