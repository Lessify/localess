import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService, DEFAULT_APP_CONFIG } from '@core/api/app-config.service';
import { firstValueFrom } from 'rxjs';

import { UnsplashPluginService } from './unsplash-plugin.service';

describe('UnsplashPluginService', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(UnsplashPluginService);
  }

  afterEach(() => {
    http.verify();
  });

  it('enabled() reflects the runtime app config', () => {
    const service = setup();
    expect(service.enabled()).toBe(false);

    TestBed.inject(AppConfigService).config.set({ ...DEFAULT_APP_CONFIG, plugins: { unsplash: true } });
    expect(service.enabled()).toBe(true);
  });

  it('search() sends the given params as query params', async () => {
    const service = setup();
    const result = firstValueFrom(service.search({ query: 'cats', page: 2, perPage: 30, orientation: 'portrait' }));
    const request = http.expectOne(req => req.url === '/api/app/plugins/unsplash/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('query')).toBe('cats');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('perPage')).toBe('30');
    expect(request.request.params.get('orientation')).toBe('portrait');
    request.flush({ total: 0, total_pages: 0, results: [] });
    expect(await result).toEqual({ total: 0, total_pages: 0, results: [] });
  });

  it('search() leaves out params that are not set', async () => {
    const service = setup();
    const result = firstValueFrom(service.search({ query: 'cats' }));
    http.expectOne({ method: 'GET', url: '/api/app/plugins/unsplash/search?query=cats' }).flush({ total: 0, total_pages: 0, results: [] });
    await result;
  });

  it('random() reads random photos', async () => {
    const service = setup();
    const result = firstValueFrom(service.random());
    http.expectOne({ method: 'GET', url: '/api/app/plugins/unsplash/random' }).flush({ results: [] });
    expect(await result).toEqual({ results: [] });
  });
});
