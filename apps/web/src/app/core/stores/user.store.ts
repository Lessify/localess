import { HttpClient } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { User, UserRole } from '@localess/shared';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';

const LS_KEY = 'LL-USER-STATE';

export interface UserState {
  id: string;
  displayName: string | undefined | null;
  initials: string | undefined | null;
  email: string | undefined | null;
  emailVerified: boolean;
  role: UserRole | undefined;
  photoUrl: string | undefined;
  // How they sign in: a password, and the linked OAuth logins
  hasPassword: boolean;
  hasGoogleLogin: boolean;
  hasMicrosoftLogin: boolean;
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
  photoUrl: undefined,
  hasPassword: false,
  hasGoogleLogin: false,
  hasMicrosoftLogin: false,
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

/** The signed-in user as state: identity, how they sign in and role (from the session). */
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
    photoUrl: user.photoUrl || undefined,
    role: user.role,
    hasPassword: user.hasPassword === true,
    hasGoogleLogin: user.identities?.some(it => it.provider === 'google') ?? false,
    hasMicrosoftLogin: user.identities?.some(it => it.provider === 'microsoft') ?? false,
    isAuthenticated: true,
    loaded: true,
  };
}

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState<UserState>(initialStateFactory),
  withProps(store => ({
    /** `loaded` as an observable, created once with the store, for guards that must wait for the session check. */
    loaded$: toObservable(store.loaded),
  })),
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
      isRoleAdmin: computed(() => state.role() === 'ADMIN'),
    };
  }),
  withHooks({
    onInit: store => {
      store.load();
    },
  }),
);
