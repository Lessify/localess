import { UserPermission, UserRole } from '@shared/models/user.model';

export interface UserInviteDialogResponse {
  displayName?: string;
  email: string;
  password: string;
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
}
