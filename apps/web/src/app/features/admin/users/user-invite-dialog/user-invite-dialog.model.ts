import { UserRole } from '@localess/shared';

/** The dialog takes no context: an invite starts from a blank form. */
export interface UserInviteDialogResult {
  displayName?: string;
  email: string;
  password: string;
  /** `null`: no access yet. */
  role: UserRole | null;
}
