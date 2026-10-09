import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { OpenApiService } from './open-api.service';

describe('OpenApiService', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http.verify();
  });

  it('generate() posts to the space open-api endpoint and returns the document as JSON', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(OpenApiService);

    const result = firstValueFrom(service.generate('space-1'));
    const document = { openapi: '3.0.3', paths: {} };
    http.expectOne({ method: 'POST', url: '/api/app/spaces/space-1/open-api' }).flush(document);

    expect(JSON.parse(await result)).toEqual(document);
  });
});
