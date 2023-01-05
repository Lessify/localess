import {createSelector} from '@ngrx/store';
import {AppState, selectUserState} from '../core.state';
import {MemoizedSelector} from '@ngrx/store/src/selector';
import {UserState} from './user.model';
import {UserRole} from '@shared/models/user.model';

export const selectUser: MemoizedSelector<AppState, UserState> = createSelector(
  selectUserState,
  (state: UserState) => state
);

export const selectUserRole: MemoizedSelector<AppState, UserRole | undefined> = createSelector(
  selectUserState,
  (state: UserState) => state.role
);

export const selectUserPermissions: MemoizedSelector<AppState, string[] | undefined> = createSelector(
  selectUserState,
  (state: UserState) => state.permissions
);
