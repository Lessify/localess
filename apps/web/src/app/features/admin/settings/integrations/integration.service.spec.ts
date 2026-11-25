import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, NEVER } from 'rxjs';

import { IntegrationService } from './integration.service';

describe('IntegrationService', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => NEVER } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(IntegrationService);
  }

  afterEach(() => http.verify());

  it('calls the admin integrations API', async () => {
    const service = setup();
    const list = firstValueFrom(service.findAll());
    http
      .expectOne({ method: 'GET', url: '/api/app/admin/integrations' })
      .flush({ integrations: [], translatePrimary: { value: 'deepl', source: 'default' } });
    expect((await list).integrations).toEqual([]);

    service.save('unsplash', { values: { apiKey: 'k' }, skipTest: true }).subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/app/admin/integrations/unsplash' }).request.body).toEqual({
      values: { apiKey: 'k' },
      skipTest: true,
    });
    service.test('unsplash').subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/app/admin/integrations/unsplash/test' }).request.body).toEqual({});
    service.setEnabled('unsplash', false).subscribe();
    expect(http.expectOne({ method: 'PATCH', url: '/api/app/admin/integrations/unsplash/enabled' }).request.body).toEqual({
      enabled: false,
    });
    service.remove('unsplash').subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/app/admin/integrations/unsplash' });
    service.setTranslatePrimary('google-translate').subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/app/admin/integrations/translate-primary' }).request.body).toEqual({
      value: 'google-translate',
    });
  });
});
