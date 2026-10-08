import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { TranslateService } from './translate.service';

describe('TranslateService', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(TranslateService);
  }

  afterEach(() => http.verify());

  it('translate() posts one string and resolves to the translated content', async () => {
    const service = setup();
    const result = firstValueFrom(service.translate({ content: '<p>Hello</p>', sourceLocale: 'en', targetLocale: 'de', format: 'html' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/translate' });
    expect(request.request.body).toEqual({ sourceLocale: 'en', targetLocale: 'de', content: '<p>Hello</p>', format: 'html' });
    request.flush({ content: '<p>Hallo</p>' });
    expect(await result).toBe('<p>Hallo</p>');
  });

  it('translate() omits the format when not given', async () => {
    const service = setup();
    const result = firstValueFrom(service.translate({ content: 'Hello', sourceLocale: 'en', targetLocale: 'de' }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/translate' });
    expect(request.request.body).toEqual({ sourceLocale: 'en', targetLocale: 'de', content: 'Hello' });
    request.flush({ content: 'Hallo' });
    expect(await result).toBe('Hallo');
  });

  it('translateBatch() posts the items and returns the batch result', async () => {
    const service = setup();
    const items = [{ id: 'a', content: 'Hello', format: 'text' as const }];
    const result = firstValueFrom(service.translateBatch({ sourceLocale: 'en', targetLocale: 'de', items }));
    const request = http.expectOne({ method: 'POST', url: '/api/app/translate' });
    expect(request.request.body).toEqual({ sourceLocale: 'en', targetLocale: 'de', items });
    const response = { items: [{ id: 'a', content: 'Hallo' }], failed: [] };
    request.flush(response);
    expect(await result).toEqual(response);
  });
});
