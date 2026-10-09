import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { User } from '@shared/models/user.model';

import { UserStore } from './user.store';

const user: User = {
  id: 'u1',
  email: 'ada@example.com',
  emailVerified: true,
  displayName: 'Ada Lovelace',
  disabled: false,
  role: 'custom',
  permissions: ['CONTENT_READ'],
  lock: true,
  providers: ['password', 'google.com'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as User;

describe('UserStore', () => {
  let http: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(UserStore);
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => http.verify());

  it('loads the session user with role, permissions and providers', () => {
    const store = setup();
    expect(store.loaded()).toBe(false);
    http.expectOne('/api/auth/me').flush({ user });
    expect(store.loaded()).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
    expect(store.initials()).toBe('AL');
    expect(store.role()).toBe('custom');
    expect(store.permissions()).toEqual(['CONTENT_READ']);
    expect(store.isLocked()).toBe(true);
    expect(store.isRoleAdmin()).toBe(false);
    expect(store.isPasswordProvider()).toBe(true);
    expect(store.isGoogleProvider()).toBe(true);
    expect(store.isMicrosoftProvider()).toBe(false);
    expect(store.numberProviders()).toBe(2);
    expect(JSON.parse(localStorage.getItem('LL-USER-STATE')!)).toEqual({ isAuthenticated: true });
  });

  it('treats a 401 as signed out', () => {
    localStorage.setItem('LL-USER-STATE', JSON.stringify({ isAuthenticated: true }));
    const store = setup();
    expect(store.isAuthenticated()).toBe(true);
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(store.isAuthenticated()).toBe(false);
    expect(store.loaded()).toBe(true);
    expect(JSON.parse(localStorage.getItem('LL-USER-STATE')!)).toEqual({ isAuthenticated: false });
  });

  it('signedOut() clears identity and access', () => {
    const store = setup();
    http.expectOne('/api/auth/me').flush({ user });
    store.signedOut();
    expect(store.isAuthenticated()).toBe(false);
    expect(store.role()).toBeUndefined();
    expect(store.permissions()).toBeUndefined();
  });
});
