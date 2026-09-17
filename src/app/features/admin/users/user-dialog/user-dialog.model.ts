import { UserPermission, UserRole } from '@shared/models/user.model';

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
