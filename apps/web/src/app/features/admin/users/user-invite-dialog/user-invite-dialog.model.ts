import { UserPermission, UserRole } from '@localess/shared';

/** The dialog takes no context: an invite starts from a blank form. */
export interface UserInviteDialogResult {
  displayName?: string;
  email: string;
  password: string;
  role?: UserRole;
  permissions?: UserPermission[];
  lock?: boolean;
}
