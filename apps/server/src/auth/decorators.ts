import { SetMetadata } from '@nestjs/common';
import type { UserPermission } from './permissions.js';

export const IS_PUBLIC = 'localess:isPublic';
export const REQUIRED_ACCESS = 'localess:requiredAccess';

export type RequiredAccess =
  | { kind: 'anyRole' }
  | { kind: 'anyOf'; permissions: UserPermission[] }
  | { kind: 'allOf'; permissions: UserPermission[] };

/** No session needed (login, public API, health). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Signed in with any role (`admin` or `custom`) — e.g. reading spaces. */
export const RequireAnyRole = () => SetMetadata(REQUIRED_ACCESS, { kind: 'anyRole' } satisfies RequiredAccess);

/** At least one of the permissions (admins always pass) — e.g. `SCHEMA_READ` or `CONTENT_READ`. */
export const RequirePermission = (...permissions: UserPermission[]) =>
  SetMetadata(REQUIRED_ACCESS, { kind: 'anyOf', permissions } satisfies RequiredAccess);

/** Every one of the permissions (admins always pass) — e.g. translate needs TRANSLATION_UPDATE and CONTENT_UPDATE. */
export const RequireAllPermissions = (...permissions: UserPermission[]) =>
  SetMetadata(REQUIRED_ACCESS, { kind: 'allOf', permissions } satisfies RequiredAccess);
