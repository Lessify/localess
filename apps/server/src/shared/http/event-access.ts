import { ADMINS, ANY_ROLE, DEVELOPERS, hasRole, TASK_KIND_ROLES, type TaskKind, type UserRole } from '@localess/shared';

import type { ChangeEvent } from '../../infra/events/event.service.js';

/**
 * Who may hear about a change: the roles of the endpoint that reads the entity (`@RequireRole`). Keep in step with the
 * controllers. An entity missing here reaches admins only, so a new one fails closed.
 */
const READ_ROLES: Record<string, readonly UserRole[]> = {
  spaces: ANY_ROLE,
  contents: ANY_ROLE,
  schemas: ANY_ROLE,
  assets: ANY_ROLE,
  translations: ANY_ROLE,
  tokens: DEVELOPERS,
  webhooks: DEVELOPERS,
  webhook_logs: DEVELOPERS,
  users: ADMINS,
};

/** Whether `user` may receive `event` on the change stream. */
export function canReceive(user: { id: string; role?: UserRole | null }, event: ChangeEvent): boolean {
  if (!hasRole(user, ANY_ROLE)) return false;
  // Everyone hears about their own account, so a changed role reaches their UI.
  if (event.entity === 'users' && event.id === user.id) return true;
  // A task's events (its row, its logs, its progress): the roles that may start its kind, as its reads; no kind: admins.
  if (event.entity === 'tasks' || event.entity === 'task_logs') {
    const roles = event.kind ? TASK_KIND_ROLES[event.kind as TaskKind] : undefined;
    return hasRole(user, roles ?? ADMINS);
  }
  return hasRole(user, READ_ROLES[event.entity] ?? ADMINS);
}
