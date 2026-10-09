import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserStore } from '@core/stores/user.store';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  const signedOut = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: UserStore, useValue: { signedOut } },
        { provide: Router, useValue: { navigate } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
    vi.clearAllMocks();
  });

  it('marks API calls as XHR (the server CSRF rule), leaving other URLs alone', () => {
    void firstValueFrom(client.post('/api/app/spaces', {}));
    expect(http.expectOne('/api/app/spaces').request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    void firstValueFrom(client.get('https://api.github.com/repos/x'));
    expect(http.expectOne('https://api.github.com/repos/x').request.headers.has('X-Requested-With')).toBe(false);
  });

  it('signs out and goes to the login page on a 401 from the app API', async () => {
    const call = firstValueFrom(client.get('/api/app/spaces'));
    http.expectOne('/api/app/spaces').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toBeTruthy();
    expect(signedOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('leaves 401s of the login endpoint to the login form', async () => {
    const call = firstValueFrom(client.post('/api/auth/login', {}));
    http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toBeTruthy();
    expect(signedOut).not.toHaveBeenCalled();
  });
});
