import { ADMINS, ANY_ROLE, DEVELOPERS, hasRole, TASK_KIND_ROLES, type TaskKind, type UserRole } from '@localess/shared';

import type { ChangeEvent } from '../../../infra/events/event.service.js';

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
  // Which integrations are on (Translate buttons, the Unsplash picker); never carries a value.
  integrations: ANY_ROLE,
};

/** Whether `user` may receive `event` on a change stream. */
export function canReceive(user: { id: string; role?: UserRole | null }, event: ChangeEvent): boolean {
  if (!hasRole(user, ANY_ROLE)) return false;
  // Everyone hears about their own account, so a changed role reaches their UI.
  if (event.entity === 'users' && event.id === user.id) return true;
  // A task's row and progress: every role, so a screen tells everyone a task is about to change its data (`GET …/tasks/active`).
  if (event.entity === 'tasks') return true;
  // A task's logs: the roles that may start its kind, as their reads; no kind: admins.
  if (event.entity === 'task_logs') {
    const roles = event.kind ? TASK_KIND_ROLES[event.kind as TaskKind] : undefined;
    return hasRole(user, roles ?? ADMINS);
  }
  return hasRole(user, READ_ROLES[event.entity] ?? ADMINS);
}

/** On the global stream: changes outside spaces (spaces themselves, users). */
export function isGlobal(event: ChangeEvent): boolean {
  return event.spaceId === null;
}

/**
 * On the stream of `spaceId`: everything that changes in the space, the space itself included (its name, locales and
 * environments are published outside spaces, as a `spaces` event, so the space lists hear them too).
 */
export function isInSpace(event: ChangeEvent, spaceId: string): boolean {
  return event.spaceId === spaceId || (event.spaceId === null && event.entity === 'spaces' && event.id === spaceId);
}
