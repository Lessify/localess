import { UserRole } from '@shared/models/user.model';

export interface UserState {
  id: string;
  displayName?: string | null;
  email?: string | null;
  emailVerified: boolean;
  role?: UserRole;
  permissions?: string[];
  photoURL?: string | null;
}
