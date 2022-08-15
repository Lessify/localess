import {Action, ActionReducer, createReducer, on} from '@ngrx/store';
import {UserState} from './user.model';
import {actionUserChange, actionUserRoleChange} from './user.actions';

export const initialState: UserState = {
  id: '',
  displayName: undefined,
  email: undefined,
  emailVerified: false,
  role: '',
  photoURL: undefined
};

const reducer: ActionReducer<UserState, Action> = createReducer(
  initialState,
  on(actionUserChange, (state, { id, displayName, email, emailVerified, role, photoURL}) => ({
    id,
    displayName,
    email,
    emailVerified,
    role,
    photoURL
  })),
  on(actionUserRoleChange, (state, { role }) => ({
    ...state,
    role
  }))
);

export function userReducer(state: UserState | undefined, action: Action): UserState {
  return reducer(state, action);
}
