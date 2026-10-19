import { z } from 'zod';
import { USER_PERMISSIONS, USER_ROLES, UserPermission } from '@localess/shared';
import { zPageable } from '@localess/shared/zod';
import { PASSWORD_MIN_LENGTH } from '../../../auth/utils/password.js';

const zRole = z.enum(USER_ROLES).nullish();
const zPermissions = z.array(z.enum(USER_PERMISSIONS as [UserPermission, ...UserPermission[]])).optional();

/** `POST /api/app/users`: `role: null` invites a user without access (so not the shared `UserInvite`). */
export const zUserInviteInput = z.object({
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  displayName: z.string().trim().max(200).optional(),
  role: zRole,
  permissions: zPermissions,
  lock: z.boolean().optional(),
});
export type UserInviteInput = z.infer<typeof zUserInviteInput>;

/** `PATCH /api/app/users/:id`: `role: null` takes every access away (so not the shared `UserUpdate`). */
export const zUserAccessUpdate = z.object({
  role: zRole,
  permissions: zPermissions,
  lock: z.boolean().optional(),
});
export type UserAccessUpdate = z.infer<typeof zUserAccessUpdate>;

/** `PATCH /api/app/users/:id/status`. */
export const zUserStatus = z.object({ disabled: z.boolean() });
export type UserStatus = z.infer<typeof zUserStatus>;

/** The fields Admin → Users may sort by (`name`: the display name). */
export const USER_SORT_FIELDS = ['email', 'name', 'role', 'createdAt', 'updatedAt'] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/** `GET /api/app/users`: one page, `?search=` (email or display name), `?active=active|inactive`. */
export const zUserPageable = zPageable(USER_SORT_FIELDS, 'email').extend({
  search: z.string().trim().max(200).optional(),
  active: z.enum(['active', 'inactive']).optional(),
});
export type UserPageable = z.infer<typeof zUserPageable>;
