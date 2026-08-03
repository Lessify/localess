import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';

import { UserStore } from './user.store';

interface FakeAuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
  providerData: { providerId: string }[];
  getIdTokenResult: () => Promise<{ claims: Record<string, unknown> }>;
}

describe('UserStore', () => {
  const LS_KEY = 'LL-USER-STATE';

  beforeEach(() => {
    localStorage.clear();
  });

  function flushMicrotasks(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  function createStore(user: FakeAuthUser | null) {
    const fakeAuth = {
      onIdTokenChanged: (next: (u: FakeAuthUser | null) => void) => {
        next(user);
        return () => {};
      },
    };
    TestBed.configureTestingModule({
      providers: [{ provide: Auth, useValue: fakeAuth }],
    });
    return TestBed.inject(UserStore);
  }

  it('is not authenticated when there is no user', async () => {
    const store = createStore(null);
    await flushMicrotasks();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('populates identity fields and computes initials from a signed-in user', async () => {
    const user: FakeAuthUser = {
      uid: 'user-1',
      displayName: 'John Doe',
      email: 'john@example.com',
      emailVerified: true,
      photoURL: null,
      providerData: [{ providerId: 'password' }],
      getIdTokenResult: () => Promise.resolve({ claims: {} }),
    };
    const store = createStore(user);
    await flushMicrotasks();

    expect(store.isAuthenticated()).toBe(true);
    expect(store.id()).toBe('user-1');
    expect(store.displayName()).toBe('John Doe');
    expect(store.initials()).toBe('JD');
    expect(store.email()).toBe('john@example.com');
    expect(store.emailVerified()).toBe(true);
    expect(store.isPasswordProvider()).toBe(true);
    expect(store.isGoogleProvider()).toBe(false);
    expect(store.numberProviders()).toBe(1);
  });

  it('detects the Google and Microsoft providers', async () => {
    const user: FakeAuthUser = {
      uid: 'user-2',
      displayName: null,
      email: null,
      emailVerified: false,
      photoURL: null,
      providerData: [{ providerId: 'google.com' }, { providerId: 'microsoft.com' }],
      getIdTokenResult: () => Promise.resolve({ claims: {} }),
    };
    const store = createStore(user);
    await flushMicrotasks();

    expect(store.isGoogleProvider()).toBe(true);
    expect(store.isMicrosoftProvider()).toBe(true);
    expect(store.numberProviders()).toBe(2);
  });

  it('patches role, permissions, and lock from token claims when present', async () => {
    const user: FakeAuthUser = {
      uid: 'user-3',
      displayName: 'Admin',
      email: 'admin@example.com',
      emailVerified: true,
      photoURL: null,
      providerData: [],
      getIdTokenResult: () => Promise.resolve({ claims: { role: 'admin', permissions: ['contents:read'], lock: false } }),
    };
    const store = createStore(user);
    await flushMicrotasks();

    expect(store.role()).toBe('admin');
    expect(store.permissions()).toEqual(['contents:read']);
    expect(store.isRoleAdmin()).toBe(true);
    expect(store.isLocked()).toBe(false);
  });

  it('leaves role/permissions/lock unset when the token claims have neither', async () => {
    const user: FakeAuthUser = {
      uid: 'user-4',
      displayName: 'Plain User',
      email: 'plain@example.com',
      emailVerified: true,
      photoURL: null,
      providerData: [],
      getIdTokenResult: () => Promise.resolve({ claims: {} }),
    };
    const store = createStore(user);
    await flushMicrotasks();

    expect(store.role()).toBeUndefined();
    expect(store.isRoleAdmin()).toBe(false);
  });

  it('setAuthenticated updates the signal and persists it to localStorage', async () => {
    const store = createStore(null);
    await flushMicrotasks();

    store.setAuthenticated(true);

    expect(store.isAuthenticated()).toBe(true);
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).isAuthenticated).toBe(true);
  });
});
