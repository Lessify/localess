import { UserPermission, UserRole } from '@shared/models/user.model';

/** The dialog takes no context: an invite starts from a blank form. */
export interface UserInviteDialogResult {
  displayName?: string;
  email: string;
  password: string;
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
}
