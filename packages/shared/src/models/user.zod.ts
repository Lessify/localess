import { z } from 'zod';

import { USER_PERMISSIONS } from '../permissions.js';
import { zPageable, zSearch } from './page.zod.js';
import { PASSWORD_MIN_LENGTH, USER_ROLES, USER_SORT_FIELDS, type UserPermission } from './user.model.js';

// App API requests of Admin → Users and of the own profile (`/api/app/me`).

/** `null` takes every access away (an invited user without access, or one whose role is removed). */
const zRole = z.enum(USER_ROLES).nullish();
const zPermissions = z.array(z.enum(USER_PERMISSIONS as [UserPermission, ...UserPermission[]])).optional();

/** `POST /api/app/users`. */
export const zUserInvite = z.object({
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  displayName: z.string().trim().max(200).optional(),
  role: zRole,
  permissions: zPermissions,
  lock: z.boolean().optional(),
});
export type UserInvite = z.infer<typeof zUserInvite>;

/** `PATCH /api/app/users/:id`: the access. */
export const zUserUpdate = z.object({
  role: zRole,
  permissions: zPermissions,
  lock: z.boolean().optional(),
});
export type UserUpdate = z.infer<typeof zUserUpdate>;

/** `PATCH /api/app/users/:id/status`. */
export const zUserStatusUpdate = z.object({ disabled: z.boolean() });
export type UserStatusUpdate = z.infer<typeof zUserStatusUpdate>;

/** `GET /api/app/users`: one page, `?search=` (email or display name), `?active=active|inactive`. */
export const zUserPageable = zPageable(USER_SORT_FIELDS, 'email').extend({
  search: zSearch,
  active: z.enum(['active', 'inactive']).optional(),
});
export type UserPageable = z.infer<typeof zUserPageable>;

/** `PATCH /api/app/me`. */
export const zMeUpdate = z.object({
  displayName: z.string().trim().max(200).nullish(),
  photoURL: z.string().trim().url().max(2048).or(z.literal('')).nullish(),
});
export type MeUpdate = z.infer<typeof zMeUpdate>;

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
