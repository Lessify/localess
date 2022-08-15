export interface UserState {
  id: string;
  displayName?: string | null;
  email?: string | null;
  emailVerified: boolean;
  role: string;
  photoURL?: string | null;
}
