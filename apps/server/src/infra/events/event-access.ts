import { canPerform, hasAnyRole, Principal, UserPermission } from '@localess/shared';
import type { ChangeEvent } from './events.service.js';

const TASK_READ = [
  UserPermission.ASSET_EXPORT,
  UserPermission.ASSET_IMPORT,
  UserPermission.CONTENT_EXPORT,
  UserPermission.CONTENT_IMPORT,
  UserPermission.SCHEMA_EXPORT,
  UserPermission.SCHEMA_IMPORT,
  UserPermission.TRANSLATION_EXPORT,
  UserPermission.TRANSLATION_IMPORT,
];

/**
 * Who may hear about a change: the permissions (any one is enough) of the endpoint that reads the
 * entity, or `'anyRole'`. Keep in step with the controllers' `@Require*`. An entity missing here
 * reaches admins only, so a new one fails closed.
 */
const READ_ACCESS: Record<string, readonly UserPermission[] | 'anyRole'> = {
  spaces: 'anyRole',
  settings: 'anyRole',
  contents: [UserPermission.CONTENT_READ],
  schemas: [UserPermission.SCHEMA_READ, UserPermission.CONTENT_READ],
  assets: [UserPermission.ASSET_READ, UserPermission.CONTENT_READ],
  translations: [UserPermission.TRANSLATION_READ],
  tasks: TASK_READ,
  task_logs: TASK_READ,
  tokens: [UserPermission.SPACE_MANAGEMENT],
  webhooks: [UserPermission.SPACE_MANAGEMENT],
  webhook_logs: [UserPermission.SPACE_MANAGEMENT],
  users: [UserPermission.USER_MANAGEMENT],
};

/** Whether `principal` may receive `event` on the change stream (the same rule Firestore rules applied to listeners). */
export function canReceive(principal: Principal, event: ChangeEvent): boolean {
  if (!hasAnyRole(principal)) return false;
  if (principal.role === 'admin') return true;
  // Everyone hears about their own account, so a changed role or permission set reaches their UI.
  if (event.entity === 'users' && event.id === principal.id) return true;
  const access = READ_ACCESS[event.entity];
  if (!access) return false;
  return access === 'anyRole' || access.some(permission => canPerform(principal, permission));
}
