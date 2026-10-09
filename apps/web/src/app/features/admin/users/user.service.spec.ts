import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { User, UserPermission } from '@localess/shared';
import { UserService } from './user.service';

describe('UserService', () => {
  let http: HttpTestingController;
  let events: Subject<ChangeEvent>;

  function setup() {
    events = new Subject<ChangeEvent>();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ChangeEventsService, useValue: { changes: () => events } }],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(UserService);
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('findAll() reads the users', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll());
    http.expectOne({ method: 'GET', url: '/api/app/users' }).flush([{ id: 'u1' }]);
    expect(await result).toEqual([{ id: 'u1' }]);
  });

  it('findAll() refetches when a user changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: User[][] = [];
    const subscription = service.findAll().subscribe(it => results.push(it));
    http.expectOne('/api/app/users').flush([]);

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone('/api/app/users');

    events.next({ spaceId: null, entity: 'users', id: 'u1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/users').flush([{ id: 'u1' } as User]);
    expect(results).toEqual([[], [{ id: 'u1' }]]);
    subscription.unsubscribe();
  });

  it('findById() reads one user', async () => {
    const service = setup();
    const result = firstValueFrom(service.findById('u1'));
    http.expectOne({ method: 'GET', url: '/api/app/users/u1' }).flush({ id: 'u1' });
    expect(await result).toEqual({ id: 'u1' });
  });

  it('update() patches role, permissions and lock', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('u1', { role: 'custom', permissions: [UserPermission.CONTENT_READ], lock: true }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/users/u1' });
    expect(request.request.body).toEqual({ role: 'custom', permissions: ['CONTENT_READ'], lock: true });
    request.flush({});
    await done;
  });

  it('update() sends a null role to clear the access', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('u1', {}));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/users/u1' });
    expect(request.request.body).toEqual({ role: null, permissions: undefined, lock: undefined });
    request.flush({});
    await done;
  });

  it('delete() deletes the user', async () => {
    const service = setup();
    const done = firstValueFrom(service.delete('u1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/users/u1' }).flush(null);
    await done;
  });

  it('invite() posts the invite', async () => {
    const service = setup();
    const invite = { email: 'new@example.com', password: 'secret1', role: 'admin' as const };
    const done = firstValueFrom(service.invite(invite));
    const request = http.expectOne({ method: 'POST', url: '/api/app/users' });
    expect(request.request.body).toEqual(invite);
    request.flush({ id: 'u2' });
    await done;
  });

  it('passwordResetLink() creates a reset link', async () => {
    const service = setup();
    const result = firstValueFrom(service.passwordResetLink('u1'));
    const link = { url: 'https://cms.example.com/auth/reset?token=t', expiresAt: '2026-01-01T00:00:00.000Z' };
    http.expectOne({ method: 'POST', url: '/api/app/users/u1/password-reset-link' }).flush(link);
    expect(await result).toEqual(link);
  });
});
