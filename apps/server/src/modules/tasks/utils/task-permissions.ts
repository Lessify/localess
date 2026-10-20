import { canPerform, UserPermission } from '@localess/shared';
import { ForbiddenException } from '@nestjs/common';

import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { toPrincipal } from '../../../shared/transformers/user.transformer.js';

/** Reading tasks, their logs and their files: any one of the import/export permissions. */
export const TASK_READ_PERMISSIONS = [
  UserPermission.ASSET_EXPORT,
  UserPermission.ASSET_IMPORT,
  UserPermission.CONTENT_EXPORT,
  UserPermission.CONTENT_IMPORT,
  UserPermission.SCHEMA_EXPORT,
  UserPermission.SCHEMA_IMPORT,
  UserPermission.TRANSLATION_EXPORT,
  UserPermission.TRANSLATION_IMPORT,
];

/** Creating or deleting a task needs the permission its kind names (firestore.rules `canManageTaskKind`). */
export function assertCanManage(user: UserEntity, kind: string): void {
  const principal = toPrincipal(user);
  const allowed = kind === 'ASSET_REGEN_METADATA' ? principal.role === 'ADMIN' : canPerform(principal, kind as UserPermission);
  if (!allowed) throw new ForbiddenException();
}
