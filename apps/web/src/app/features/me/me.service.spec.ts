import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserStore } from '@core/stores/user.store';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';

import { MeService } from './me.service';

describe('MeService', () => {
  let http: HttpTestingController;
  let load: ReturnType<typeof vi.fn>;
  let signedIn: ReturnType<typeof vi.fn>;

  function setup() {
    load = vi.fn();
    signedIn = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: UserStore, useValue: { load, signedIn } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(MeService);
  }

  afterEach(() => {
    http.verify();
  });

  it('updateProfile() patches display name and photo; the store takes the user it answers', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateProfile({ displayName: 'Alex', photoUrl: 'https://example.com/a.png' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/me' });
    expect(request.request.body).toEqual({ displayName: 'Alex', photoUrl: 'https://example.com/a.png' });
    request.flush({ id: 'u1', displayName: 'Alex' });
    await done;
    expect(signedIn).toHaveBeenCalledWith({ id: 'u1', displayName: 'Alex' });
    expect(load).not.toHaveBeenCalled();
  });

  it('updateEmail() puts the new email with the current password; the store takes the user it answers', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateEmail({ email: 'new@example.com', currentPassword: 'old-secret' }));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/me/email' });
    expect(request.request.body).toEqual({ email: 'new@example.com', currentPassword: 'old-secret' });
    request.flush({ id: 'u1', email: 'new@example.com' });
    await done;
    expect(signedIn).toHaveBeenCalledWith({ id: 'u1', email: 'new@example.com' });
    expect(load).not.toHaveBeenCalled();
  });

  it('updatePassword() puts current and new password, and reads nothing again', async () => {
    const service = setup();
    const done = firstValueFrom(service.updatePassword({ newPassword: 'new-secret', currentPassword: 'old-secret' }));
    const request = http.expectOne({ method: 'PUT', url: '/api/app/me/password' });
    expect(request.request.body).toEqual({ currentPassword: 'old-secret', newPassword: 'new-secret' });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await done;
    expect(signedIn).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it('leaves the store alone when the server rejects the change', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateEmail({ email: 'new@example.com', currentPassword: 'wrong' }));
    http.expectOne('/api/app/me/email').flush({ message: 'Current password is incorrect' }, { status: 401, statusText: 'Unauthorized' });
    await expect(done).rejects.toMatchObject({ status: 401 });
    expect(signedIn).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });
});
