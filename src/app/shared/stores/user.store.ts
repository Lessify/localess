import { computed, inject } from '@angular/core';
import { Auth, user } from '@angular/fire/auth';
import { tapResponse } from '@ngrx/operators';
import { getState, patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { UserRole } from '@shared/models/user.model';
import { EMPTY, from, pipe, switchMap } from 'rxjs';

const LS_KEY = 'LL-USER-STATE';

export interface UserState {
  id: string;
  displayName: string | undefined | null;
  email: string | undefined | null;
  emailVerified: boolean;
  role: UserRole | undefined;
  permissions: string[] | undefined;
  lock: boolean | undefined;
  photoURL: string | undefined | null;
  // Provider Data
  isPasswordProvider: boolean;
  isGoogleProvider: boolean;
  isMicrosoftProvider: boolean;
  numberProviders: number;
  // Authenticated
  isAuthenticated: boolean;
}

export const initialState: UserState = {
  id: '',
  displayName: undefined,
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
};

const initialStateFactory = (): UserState => {
  const state = localStorage.getItem(LS_KEY);
  if (state) {
    return { ...initialState, ...JSON.parse(state) };
  }
  return { ...initialState };
};

export const UserStore = signalStore(
  { providedIn: 'root' },
  withState<UserState>(initialStateFactory),
  withMethods(state => {
    const auth = inject(Auth);
    return {
      load: rxMethod<void>(
        pipe(
          switchMap(() => user(auth)),
          tapResponse({
            next: user => {
              console.log('Loaded user', user);
              if (user) {
                patchState(state, {
                  id: user.uid,
                  displayName: user.displayName,
                  email: user.email,
                  emailVerified: user.emailVerified,
                  photoURL: user.photoURL,
                  numberProviders: user.providerData.length || 0,
                  isPasswordProvider: user.providerData.some(it => it.providerId === 'password') || false,
                  isGoogleProvider: user.providerData.some(it => it.providerId === 'google.com') || false,
                  isMicrosoftProvider: user.providerData.some(it => it.providerId === 'microsoft.com') || false,
                  isAuthenticated: true,
                });
                localStorage.setItem(LS_KEY, JSON.stringify({ isAuthenticated: true }));
              } else {
                patchState(state, { isAuthenticated: false });
                localStorage.setItem(LS_KEY, JSON.stringify({ isAuthenticated: false }));
              }
            },
            error: error => {
              console.error('Error loading user', error);
            },
          }),
          switchMap(user => from(user?.getIdTokenResult() || EMPTY)),
          tapResponse({
            next: token => {
              console.log('Loaded user token', token);
              if (token.claims['role'] || token.claims['permissions']) {
                const role = token.claims['role'] as UserRole | undefined;
                const permissions = token.claims['permissions'] as string[] | undefined;
                const lock = token.claims['lock'] as boolean | undefined;
                patchState(state, { role, permissions, lock });
              }
            },
            error: error => {
              console.error('Error loading token', error);
            },
          }),
        ),
      ),
      setAuthenticated: (isAuthenticated: boolean) => {
        patchState(state, { isAuthenticated });
        localStorage.setItem(LS_KEY, JSON.stringify({ isAuthenticated }));
      },
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
      console.log('onInit', getState(store));
      store.load();
    },
    onDestroy: store => {
      console.log('onDestroy', getState(store));
    },
  }),
);
