import {ActionReducerMap, createFeatureSelector, MetaReducer} from '@ngrx/store';
import {routerReducer, RouterReducerState} from '@ngrx/router-store';

import {environment} from '../../../environments/environment';

import {initStateFromLocalStorage} from '../meta-reducers/init-state-from-local-storage.reducer';
import {debug} from '../meta-reducers/debug.reducer';
import {RouterStateUrl} from '../router/router.state';
import {settingsReducer} from './settings/settings.reducer';
import {SettingsState} from './settings/settings.model';
import {authReducer} from './auth/auth.reducer';
import {AuthState} from './auth/auth.models';
import {UserState} from './user/user.model';
import {userReducer} from './user/user.reducer';
import {spaceReducer} from './space/space.reducer';
import {SpaceState} from './space/space.model';

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  user: userReducer,
  space: spaceReducer,
  settings: settingsReducer,
  router: routerReducer
};

export const metaReducers: MetaReducer<AppState>[] = [initStateFromLocalStorage];

if (!environment.production) {
  metaReducers.unshift(debug);
}

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUserState = createFeatureSelector<UserState>('user');
export const selectSpaceState = createFeatureSelector<SpaceState>('space');

export const selectSettingsState = createFeatureSelector<SettingsState>('settings');
export const selectRouterState = createFeatureSelector<RouterReducerState<RouterStateUrl>>('router');

export interface AppState {
  auth: AuthState;
  user: UserState;
  space: SpaceState;
  settings: SettingsState;
  router: RouterReducerState<RouterStateUrl>;
}
