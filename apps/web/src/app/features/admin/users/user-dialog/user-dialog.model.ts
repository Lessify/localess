import { UserPermission, UserRole } from '@localess/shared';

export interface UserDialogContext {
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
}

export interface UserDialogResult {
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
}
