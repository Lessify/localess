import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../../../auth/utils/password.js';

/** `PATCH /api/app/me`. */
export const zMeProfileUpdate = z.object({
  displayName: z.string().trim().max(200).nullish(),
  photoURL: z.string().trim().url().max(2048).or(z.literal('')).nullish(),
});
export type MeProfileUpdate = z.infer<typeof zMeProfileUpdate>;

/** `PUT /api/app/me/email`. */
export const zMeEmailUpdate = z.object({
  email: z.string().trim().email(),
  currentPassword: z.string().optional(),
});
export type MeEmailUpdate = z.infer<typeof zMeEmailUpdate>;

/** `PUT /api/app/me/password`. */
export const zMePasswordUpdate = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});
export type MePasswordUpdate = z.infer<typeof zMePasswordUpdate>;
