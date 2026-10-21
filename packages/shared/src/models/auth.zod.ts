import { z } from 'zod';

import { PASSWORD_MIN_LENGTH } from './user.model.js';
import { zEmail } from './user.zod.js';

// Auth requests (`/api/auth`).

/** `POST /api/auth/login`. */
export const zAuthLogin = z.strictObject({
  email: zEmail,
  password: z.string().min(1),
});
export type AuthLogin = z.infer<typeof zAuthLogin>;

/** `POST /api/auth/password-reset/request`. */
export const zPasswordResetRequest = z.strictObject({ email: zEmail });
export type PasswordResetRequest = z.infer<typeof zPasswordResetRequest>;

/** `POST /api/auth/password-reset/confirm`. */
export const zPasswordResetConfirm = z.strictObject({ token: z.string().min(1), password: z.string().min(PASSWORD_MIN_LENGTH) });
export type PasswordResetConfirm = z.infer<typeof zPasswordResetConfirm>;
