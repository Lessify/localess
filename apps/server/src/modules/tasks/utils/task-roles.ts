import { hasRole, TASK_KIND_ROLES, type TaskKind } from '@localess/shared';
import { ForbiddenException } from '@nestjs/common';

import type { UserEntity } from '../../../shared/entities/user.entity.js';

/** Creating or deleting a task needs the roles its kind names (`TASK_KIND_ROLES`, `@localess/shared`). */
export function assertCanManage(user: UserEntity, kind: string): void {
  const roles = TASK_KIND_ROLES[kind as TaskKind] as (typeof TASK_KIND_ROLES)[TaskKind] | undefined;
  if (!roles || !hasRole(user, roles)) throw new ForbiddenException();
}
