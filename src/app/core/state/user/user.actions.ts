import {createAction, props} from '@ngrx/store';
import {UserRole} from '@shared/models/user.model';

// tslint:disable-next-line:typedef
export const actionUserChange = createAction(
  '[User] Change',
  props<{
    id: string;
    displayName?: string | null;
    email?: string | null;
    emailVerified: boolean;
    role?: UserRole;
    permissions?: string[];
    photoURL?: string | null
  }>()
);

export const actionUserRoleChange = createAction(
  '[User Role | Permission] Change',
  props<{
    role?: UserRole;
    permissions?: string[];
  }>()
);
