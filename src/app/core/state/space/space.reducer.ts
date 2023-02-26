import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {SpaceState} from './space.model';
import {
  actionSpaceAssetPathChange,
  actionSpaceChange,
  actionSpaceContentPathChange
} from './space.actions';


export const initialState: SpaceState = {
  id: '',
  name: 'Not Selected'
};

const reducer: ActionReducer<SpaceState, Action> = createReducer(
  initialState,
  on(actionSpaceChange, (state, {id, name}) => ({
      id,
      name
    })
  ),
  on(actionSpaceContentPathChange, (state, {contentPath}) => ({
    ...state,
    contentPath
    })
  ),
  on(actionSpaceAssetPathChange, (state, {assetPath}) => ({
      ...state,
    assetPath
    })
  )
);

export function spaceReducer(
  state: SpaceState | undefined,
  action: Action
): SpaceState {
  return reducer(state, action);
}
