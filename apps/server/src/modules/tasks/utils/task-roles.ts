import { ADMINS, CONTENT_WRITERS, DEVELOPERS, hasRole, TaskKind, type UserRole } from '@localess/shared';
import { ForbiddenException } from '@nestjs/common';

import type { UserEntity } from '../../../shared/entities/user.entity.js';

/** Who may create or delete a task of each kind: schemas are the developers', metadata the admins', the rest the content writers'. */
const KIND_ROLES: Record<TaskKind, readonly UserRole[]> = {
  [TaskKind.ASSET_EXPORT]: CONTENT_WRITERS,
  [TaskKind.ASSET_IMPORT]: CONTENT_WRITERS,
  [TaskKind.ASSET_REGEN_METADATA]: ADMINS,
  [TaskKind.CONTENT_EXPORT]: CONTENT_WRITERS,
  [TaskKind.CONTENT_IMPORT]: CONTENT_WRITERS,
  [TaskKind.SCHEMA_EXPORT]: DEVELOPERS,
  [TaskKind.SCHEMA_IMPORT]: DEVELOPERS,
  [TaskKind.TRANSLATION_EXPORT]: CONTENT_WRITERS,
  [TaskKind.TRANSLATION_IMPORT]: CONTENT_WRITERS,
};

/** Creating or deleting a task needs the roles its kind names (reading tasks: `CONTENT_WRITERS`, on the controller). */
export function assertCanManage(user: UserEntity, kind: string): void {
  const roles = KIND_ROLES[kind as TaskKind];
  if (!roles || !hasRole(user, roles)) throw new ForbiddenException();
}
