import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {SpaceState} from './space.model';
import {actionSpaceChange} from './space.actions';


export const initialState: SpaceState = {
  id: '',
  name: 'Not Selected'
};

const reducer: ActionReducer<SpaceState, Action> = createReducer(
  initialState,
  on(
    actionSpaceChange,
    (state, {id, name}) => ({
      id,
      name
    })
  )
);

export function spaceReducer(
  state: SpaceState | undefined,
  action: Action
): SpaceState {
  return reducer(state, action);
}
