import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from '@core/services/notification.service';
import { vi } from 'vitest';

import { CoreModule } from './core.module';

describe('CoreModule', () => {
  function setup() {
    const error = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        importProvidersFrom(CoreModule),
        { provide: NotificationService, useValue: { error } },
      ],
    });
    return { http: TestBed.inject(HttpClient), httpMock: TestBed.inject(HttpTestingController), error };
  }

  it('leaves a handled HTTP error to its caller: no generic "An error occurred" toast on top', () => {
    const { http, httpMock, error } = setup();
    const handled = vi.fn();

    http.post('/api/app/users', {}).subscribe({ error: handled });
    httpMock.expectOne('/api/app/users').flush({ message: 'Validation failed' }, { status: 400, statusText: 'Bad Request' });

    expect(handled).toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    httpMock.verify();
  });
});
