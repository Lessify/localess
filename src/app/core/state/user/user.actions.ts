import {createAction, props} from '@ngrx/store';

// tslint:disable-next-line:typedef
export const actionUserChange = createAction(
  '[User] Change',
  props<{
    id: string;
    displayName?: string | null;
    email?: string | null;
    emailVerified: boolean;
    role: string;
    photoURL?: string | null
  }>()
);

export const actionUserRoleChange = createAction(
  '[User Role] Change',
  props<{
    role: string;
  }>()
);
