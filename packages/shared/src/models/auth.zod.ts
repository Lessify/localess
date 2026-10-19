import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from './user.model.js';

// Auth requests (`/api/auth`).

/** `POST /api/auth/login`. */
export const zAuthLogin = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
export type AuthLogin = z.infer<typeof zAuthLogin>;

/** `POST /api/auth/password-reset/request`. */
export const zPasswordResetRequest = z.object({ email: z.string().trim().email() });
export type PasswordResetRequest = z.infer<typeof zPasswordResetRequest>;

/** `POST /api/auth/password-reset/confirm`. */
export const zPasswordResetConfirm = z.object({ token: z.string().min(1), password: z.string().min(PASSWORD_MIN_LENGTH) });
export type PasswordResetConfirm = z.infer<typeof zPasswordResetConfirm>;
