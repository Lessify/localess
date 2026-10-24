import { UserRole } from '@localess/shared';

export interface UserDialogContext {
  role?: UserRole;
}

export interface UserDialogResult {
  /** `null`: no access. */
  role: UserRole | null;
}
