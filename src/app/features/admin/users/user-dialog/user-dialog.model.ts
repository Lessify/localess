import { UserPermission, UserRole } from '@shared/models/user.model';

export interface UserDialogModel {
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
}
