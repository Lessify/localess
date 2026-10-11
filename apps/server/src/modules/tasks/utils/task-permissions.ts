import { ForbiddenException } from '@nestjs/common';
import { canPerform, UserPermission } from '@localess/shared';
import { toPrincipal, type UserRow } from '../../../auth/users/users.service.js';

/** Creating or deleting a task needs the permission its kind names (firestore.rules `canManageTaskKind`). */
export function assertCanManage(user: UserRow, kind: string): void {
  const principal = toPrincipal(user);
  const allowed = kind === 'ASSET_REGEN_METADATA' ? principal.role === 'ADMIN' : canPerform(principal, kind as UserPermission);
  if (!allowed) throw new ForbiddenException();
}
