import { AuthData } from 'firebase-functions/lib/common/providers/https';
import { ROLE_ADMIN, ROLE_CUSTOM } from '../config';
import { UserPermission } from '../models/user.model';

/**
 * Check roles of authenticated user
 * @param {string} role roles to check
 * @param {AuthData} auth request AuthData
 * @return {boolean} true in case role is present
 */
export function hasRole(role: string, auth?: AuthData): boolean {
  return auth?.token['role'] === role;
}

/**
 * Check roles of authenticated user
 * @param {string[]} roles roles to check
 * @param {AuthData} auth request AuthData
 * @return {boolean} true in case role is present
 */
export function hasAnyRole(roles: string[], auth?: AuthData): boolean {
  if (auth?.token['role']) {
    return roles.includes(auth.token['role']);
  }
  return false;
}

/**
 * Check if AuthData contains required permission
 * @param {UserPermission} permission - a user permission
 * @param {AuthData} auth request AuthData
 * @return {boolean} true in case role is present
 */
export function canPerform(permission: UserPermission, auth?: AuthData): boolean {
  if (hasRole(ROLE_ADMIN, auth)) {
    return true;
  }
  if (hasRole(ROLE_CUSTOM, auth)) {
    return auth?.token['permissions'].includes(permission) || false;
  }
  return false;
}
