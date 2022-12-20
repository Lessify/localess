import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {UserState} from './user.model';
import {actionUserChange, actionUserRoleChange} from './user.actions';

export const initialState: UserState = {
  id: '',
  displayName: undefined,
  email: undefined,
  emailVerified: false,
  role: undefined,
  photoURL: undefined,
  permissions: undefined
};

const reducer: ActionReducer<UserState, Action> = createReducer(
  initialState,
  on(actionUserChange, (state, { id, displayName, email, emailVerified, role, permissions, photoURL}) => ({
    id,
    displayName,
    email,
    emailVerified,
    role,
    permissions,
    photoURL
  })),
  on(actionUserRoleChange, (state, { role, permissions }) => ({
    ...state,
    role,
    permissions
  }))
);

export function userReducer(state: UserState | undefined, action: Action): UserState {
  return reducer(state, action);
}
