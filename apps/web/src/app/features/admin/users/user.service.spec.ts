import { HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangeEvent, ChangeEventsService } from '@core/api/change-events.service';
import { firstValueFrom, Subject } from 'rxjs';
import { vi } from 'vitest';

import { Page, User } from '@localess/shared';
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

  const params = new HttpParams().set('page', 1).set('size', 25).set('search', 'ali');
  const page = (items: User[]): Page<User> => ({ items, page: 1, size: 25, total: 26 });

  it('findAll() reads one page with the given query', async () => {
    const service = setup();
    const result = firstValueFrom(service.findAll(params));
    http.expectOne({ method: 'GET', url: '/api/app/users?page=1&size=25&search=ali' }).flush(page([{ id: 'u1' } as User]));
    expect(await result).toEqual(page([{ id: 'u1' } as User]));
  });

  it('findAll() reads the page again when a user changes', async () => {
    vi.useFakeTimers();
    const service = setup();
    const results: Page<User>[] = [];
    const subscription = service.findAll(params).subscribe(it => results.push(it));
    http.expectOne('/api/app/users?page=1&size=25&search=ali').flush(page([]));

    events.next({ spaceId: null, entity: 'spaces', id: 's1', op: 'updated' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectNone(() => true);

    events.next({ spaceId: null, entity: 'users', id: 'u1', op: 'created' });
    await vi.advanceTimersByTimeAsync(200);
    http.expectOne('/api/app/users?page=1&size=25&search=ali').flush(page([{ id: 'u1' } as User]));
    expect(results.map(it => it.items.length)).toEqual([0, 1]);
    subscription.unsubscribe();
  });

  it('update() patches the role', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('u1', { role: 'EDITOR' }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/users/u1' });
    expect(request.request.body).toEqual({ role: 'EDITOR' });
    request.flush({});
    await done;
  });

  it('update() sends a null role to clear the access', async () => {
    const service = setup();
    const done = firstValueFrom(service.update('u1', { role: null }));
    const request = http.expectOne({ method: 'PATCH', url: '/api/app/users/u1' });
    expect(request.request.body).toEqual({ role: null });
    request.flush({});
    await done;
  });

  it('remove() deletes the user', async () => {
    const service = setup();
    const done = firstValueFrom(service.remove('u1'));
    http.expectOne({ method: 'DELETE', url: '/api/app/users/u1' }).flush(null);
    await done;
  });

  it('updateStatus() patches the status', async () => {
    const service = setup();
    const done = firstValueFrom(service.updateStatus('u1', { disabled: true }));
    const req = http.expectOne({ method: 'PATCH', url: '/api/app/users/u1/status' });
    expect(req.request.body).toEqual({ disabled: true });
    req.flush({});
    await done;
  });

  it('create() posts the new user', async () => {
    const service = setup();
    const model = { email: 'new@example.com', password: 'secret1', role: 'ADMIN' as const };
    const done = firstValueFrom(service.create(model));
    const request = http.expectOne({ method: 'POST', url: '/api/app/users' });
    expect(request.request.body).toEqual(model);
    request.flush({ id: 'u2' });
    await done;
  });

  it('createPasswordResetLink() creates a reset link', async () => {
    const service = setup();
    const result = firstValueFrom(service.createPasswordResetLink('u1'));
    const link = { url: 'https://cms.example.com/auth/reset?token=t', expiresAt: '2026-01-01T00:00:00.000Z' };
    http.expectOne({ method: 'POST', url: '/api/app/users/u1/password-reset-link' }).flush(link);
    expect(await result).toEqual(link);
  });
});
