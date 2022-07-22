import {Action, ActionReducer} from '@ngrx/store';

import {AppState} from '../state/core.state';

export function debug(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return function (state: AppState | undefined, action: Action) {
    const newState = reducer(state, action);
    console.log(`[DEBUG] action: ${action.type}`, {
      payload: (<any>action).payload,
      oldState: state,
      newState
    });
    return newState;
  };
}
