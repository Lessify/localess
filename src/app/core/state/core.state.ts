import { ActionReducerMap, MetaReducer, createFeatureSelector } from '@ngrx/store';
import { routerReducer, RouterReducerState } from '@ngrx/router-store';

import { environment } from '../../../environments/environment';

import { initStateFromLocalStorage } from '../meta-reducers/init-state-from-local-storage.reducer';
import { debug } from '../meta-reducers/debug.reducer';
import { RouterStateUrl } from '../router/router.state';
import { settingsReducer } from './settings/settings.reducer';
import { SettingsState } from './settings/settings.model';
import { authReducer } from './auth/auth.reducer';
import { AuthState } from './auth/auth.models';
import { UserState } from './user/user.model';
import { userReducer } from './user/user.reducer';

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  user: userReducer,
  settings: settingsReducer,
  router: routerReducer
};

export const metaReducers: MetaReducer<AppState>[] = [initStateFromLocalStorage];

if (!environment.production) {
  if (!environment.test) {
    metaReducers.unshift(debug);
  }
}

export const selectAuthState = createFeatureSelector<AppState, AuthState>('auth');

export const selectUserState = createFeatureSelector<AppState, UserState>('user');

export const selectSettingsState = createFeatureSelector<AppState, SettingsState>('settings');

export const selectRouterState = createFeatureSelector<AppState, RouterReducerState<RouterStateUrl>>('router');

export interface AppState {
  auth: AuthState;
  user: UserState;
  settings: SettingsState;
  router: RouterReducerState<RouterStateUrl>;
}
