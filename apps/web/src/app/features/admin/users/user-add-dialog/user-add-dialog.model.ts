import { UserRole } from '@localess/shared';

/** The dialog takes no context: adding a user starts from a blank form. */
export interface UserAddDialogResult {
  displayName?: string;
  email: string;
  password: string;
  /** `null`: no access yet. */
  role: UserRole | null;
}
