import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserStore } from '@shared/stores/user.store';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { MeService } from './me.service';

describe('MeService', () => {
  let http: HttpTestingController;
  let load: ReturnType<typeof vi.fn>;

  function setup() {
    load = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: UserStore, useValue: { load } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(MeService);
  }

  afterEach(() => {
    http.verify();
  });

  it('updateProfile() patches display name and photo, then reloads the user', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateProfile({ displayName: 'Alex', photoURL: 'https://example.com/a.png' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/me' });
    expect(request.request.body).toEqual({ displayName: 'Alex', photoURL: 'https://example.com/a.png' });
    request.flush({ id: 'u1' });
    await done;
    expect(load).toHaveBeenCalled();
  });

  it('updateEmail() puts the new email with the current password, then reloads the user', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateEmail('new@example.com', 'old-secret'));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/me/email' });
    expect(request.request.body).toEqual({ email: 'new@example.com', currentPassword: 'old-secret' });
    request.flush({ id: 'u1' });
    await done;
    expect(load).toHaveBeenCalled();
  });

  it('updatePassword() puts current and new password', async () => {
    const service = setup();
    const done = firstValueFrom(service.updatePassword('new-secret', 'old-secret'));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/me/password' });
    expect(request.request.body).toEqual({ currentPassword: 'old-secret', newPassword: 'new-secret' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await done;
  });

  it('does not reload the user when the server rejects the change', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateEmail('new@example.com', 'wrong'));
    http.expectOne('/api/app/me/email').flush({ message: 'Current password is incorrect' }, { status: 401, statusText: 'Unauthorized' });
    await expect(done).rejects.toMatchObject({ status: 401 });
    expect(load).not.toHaveBeenCalled();
  });
});
