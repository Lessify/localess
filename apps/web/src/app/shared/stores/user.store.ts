import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { User, UserRole } from '@shared/models/user.model';
import { pipe, switchMap } from 'rxjs';

const LS_KEY = 'LL-USER-STATE';

export interface UserState {
  id: string;
  displayName: string | undefined | null;
  initials: string | undefined | null;
  email: string | undefined | null;
  emailVerified: boolean;
  role: UserRole | undefined;
  permissions: string[] | undefined;
  lock: boolean | undefined;
  photoURL: string | undefined;
  // Provider Data
  isPasswordProvider: boolean;
  isGoogleProvider: boolean;
  isMicrosoftProvider: boolean;
  numberProviders: number;
  // Authenticated
  isAuthenticated: boolean;
  /** The session check (`GET /api/auth/me`) has answered at least once. */
  loaded: boolean;
}

export const initialState: UserState = {
  id: '',
  displayName: undefined,
  initials: undefined,
  email: undefined,
  emailVerified: false,
  role: undefined,
  photoURL: undefined,
  permissions: undefined,
  lock: undefined,
  isPasswordProvider: false,
  isGoogleProvider: false,
  isMicrosoftProvider: false,
  numberProviders: 0,
  isAuthenticated: false,
  loaded: false,
};

const initialStateFactory = (): UserState => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state), loaded: false };
  }
  return { ...initialState };
};

/** The signed-in user as state: identity, providers, role and permissions (from the session, not token claims). */
export function userToState(user: User): Partial<UserState> {
  return {
    id: user.id,
    displayName: user.displayName,
    initials: user.displayName
      ? user.displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
      : undefined,
    email: user.email,
    emailVerified: user.emailVerified,
    photoURL: user.photoURL || undefined,
    role: user.role,
    permissions: user.permissions,
    lock: user.lock,
    numberProviders: user.providers.length,
    isPasswordProvider: user.providers.includes('password'),
    isGoogleProvider: user.providers.includes('google.com'),
    isMicrosoftProvider: user.providers.includes('microsoft.com'),
    isAuthenticated: true,
    loaded: true,
  };
}

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState<UserState>(initialStateFactory),
  withMethods(state => {
    const http = inject(HttpClient);
    const signedIn = (user: User) => {
      patchState(state, userToState(user));
      localStorage.setItem(LS_KEY, JSON.stringify({ isAuthenticated: true }));
    };
    const signedOut = () => {
      patchState(state, { ...initialState, loaded: true });
      localStorage.setItem(LS_KEY, JSON.stringify({ isAuthenticated: false }));
    };
    return {
      /** Reads the session. A 401 means signed out. */
      load: rxMethod<void>(
        pipe(
          switchMap(() => http.get<{ user: User }>('/api/auth/me')),
          tapResponse({
            next: ({ user }) => signedIn(user),
            error: () => signedOut(),
          }),
        ),
      ),
      signedIn,
      signedOut,
    };
  }),
  withComputed(state => {
    return {
      isRoleAdmin: computed(() => state.role() === 'admin'),
      isLocked: computed(() => state.lock() === true),
    };
  }),
  withHooks({
    onInit: store => {
      store.load();
    },
  }),
);
