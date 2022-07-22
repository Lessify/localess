import {createAction, props} from '@ngrx/store';

// tslint:disable-next-line:typedef
export const actionUserChange = createAction(
  '[User] Change',
  props<{
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: string;
  }>()
);

export const actionUserRoleChange = createAction(
  '[User Role] Change',
  props<{
    role: string;
  }>()
);
