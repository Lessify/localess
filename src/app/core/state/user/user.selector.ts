import {createSelector} from '@ngrx/store';
import {AppState, selectUserState} from '../core.state';
import {MemoizedSelector} from '@ngrx/store/src/selector';
import {UserState} from './user.model';

export const selectUser: MemoizedSelector<AppState, UserState> = createSelector(
  selectUserState,
  (state: UserState) => state
);

export const selectUserRole: MemoizedSelector<AppState, string> = createSelector(
  selectUserState,
  (state: UserState) => state.role
);
