import { ADMINS, ANY_ROLE, CONTENT_WRITERS, DEVELOPERS, hasRole, type UserRole } from '@localess/shared';

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
  tasks: CONTENT_WRITERS,
  task_logs: CONTENT_WRITERS,
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
  return hasRole(user, READ_ROLES[event.entity] ?? ADMINS);
}
