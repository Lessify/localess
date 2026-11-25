import { z } from 'zod';

import { zPageable, zSearch } from './page.zod.js';
import { PASSWORD_MIN_LENGTH, USER_ROLES, USER_SORT_FIELDS } from './user.model.js';

// App API requests of Admin → Users and of the own profile (`/api/app/me`).

/** An email address, trimmed first (zod 4's `z.email()` checks the format, not trimmed text). */
export const zEmail = z.string().trim().pipe(z.email());

/** A user's one role; `null` takes every access away (an invited user without access, or one whose role is removed). */
const zRole = z.enum(USER_ROLES).nullable();

/** `POST /api/app/users`: no role given, no access yet. Strict: an old client's `permissions` is a 400, not dropped. */
export const zUserAdd = z.strictObject({
  email: zEmail,
  password: z.string().min(PASSWORD_MIN_LENGTH),
  displayName: z.string().trim().max(200).optional(),
  role: zRole.optional(),
});
export type UserAdd = z.infer<typeof zUserAdd>;

/** `PATCH /api/app/users/:id`: the role. */
export const zUserUpdate = z.strictObject({ role: zRole });
export type UserUpdate = z.infer<typeof zUserUpdate>;

/** `PATCH /api/app/users/:id/status`. */
export const zUserStatusUpdate = z.strictObject({ disabled: z.boolean() });
export type UserStatusUpdate = z.infer<typeof zUserStatusUpdate>;

/** `GET /api/app/users`: one page, `?search=` (email or display name), `?active=active|inactive`. */
export const zUserPageable = zPageable(USER_SORT_FIELDS, 'email').extend({
  search: zSearch,
  active: z.enum(['active', 'inactive']).optional(),
});
export type UserPageable = z.infer<typeof zUserPageable>;

/** `PATCH /api/app/me`: a field left out is kept; `''` or `null` clears it. The avatar is an http(s) URL. */
export const zMeUpdate = z.strictObject({
  displayName: z.string().trim().max(200).nullish(),
  photoUrl: z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), z.url({ protocol: /^https?$/ }).max(2048)]))
    .nullish(),
});
export type MeUpdate = z.infer<typeof zMeUpdate>;

/** `PUT /api/app/me/email`. */
export const zMeEmailUpdate = z.strictObject({
  email: zEmail,
  currentPassword: z.string().optional(),
});
export type MeEmailUpdate = z.infer<typeof zMeEmailUpdate>;

/** `PUT /api/app/me/password`. */
export const zMePasswordUpdate = z.strictObject({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});
export type MePasswordUpdate = z.infer<typeof zMePasswordUpdate>;
