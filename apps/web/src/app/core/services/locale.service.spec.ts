import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PublicAppConfig } from '@localess/shared';
import { firstValueFrom } from 'rxjs';

import { AppConfigService } from '@core/api/app-config.service';

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

  const translate = (config: PublicAppConfig['translate']) =>
    TestBed.inject(AppConfigService).config.update(it => ({ ...it, translate: config }));

  it('translates from and to the locales the connected providers support', () => {
    const service = setup();
    translate({ enabled: true, sourceLocales: ['en', 'de'], targetLocales: ['de'] });
    expect(service.isLocaleTranslatableFrom('en')).toBe(true);
    expect(service.isLocaleTranslatableFrom('ka')).toBe(false);
    expect(service.isLocaleTranslatableTo('de')).toBe(true);
    expect(service.isLocaleTranslatableTo('ka')).toBe(false);
  });

  it('translates nothing when no provider is connected', () => {
    const service = setup();
    translate({ enabled: false, sourceLocales: [], targetLocales: [] });
    expect(service.isLocaleTranslatableFrom('en')).toBe(false);
    expect(service.isLocaleTranslatableTo('de')).toBe(false);
  });
});
