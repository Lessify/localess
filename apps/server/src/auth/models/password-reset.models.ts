import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../utils/password.js';

/** `POST /api/auth/password-reset/request`. */
export const zPasswordResetRequest = z.object({ email: z.string().trim().email() });
export type PasswordResetRequest = z.infer<typeof zPasswordResetRequest>;

/** `POST /api/auth/password-reset/confirm`. */
export const zPasswordResetConfirm = z.object({ token: z.string().min(1), password: z.string().min(PASSWORD_MIN_LENGTH) });
export type PasswordResetConfirm = z.infer<typeof zPasswordResetConfirm>;
