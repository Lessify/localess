import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {UserState} from './user.model';
import {actionUserChange, actionUserRoleChange} from './user.actions';

export const initialState: UserState = {
  id: '',
  name: '',
  email: '',
  emailVerified: false,
  role: ''
};

const reducer: ActionReducer<UserState, Action> = createReducer(
  initialState,
  on(actionUserChange, (state, { id, name, email, emailVerified, role }) => ({
    id,
    name,
    email,
    emailVerified,
    role
  })),
  on(actionUserRoleChange, (state, { role }) => ({
    ...state,
    role
  }))
);

export function userReducer(state: UserState | undefined, action: Action): UserState {
  return reducer(state, action);
}
