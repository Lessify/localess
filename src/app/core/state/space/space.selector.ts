import {createSelector} from '@ngrx/store';
import {AppState, selectSpaceState} from '../core.state';
import {MemoizedSelector} from '@ngrx/store/src/selector';
import {SpaceState} from './space.model';

export const selectSpace: MemoizedSelector<AppState, SpaceState> = createSelector(
  selectSpaceState,
  (state: SpaceState) => state
);
