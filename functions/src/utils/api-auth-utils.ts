import { isTokenV1, isTokenV2, Token, TokenPermission } from '../models';

/**
 * Check if Token contains required permission
 * @param {TokenPermission} permission - a user permission
 * @param {Token} token request Token
 * @return {boolean} true in case role is present
 */
export function canPerform(permission: TokenPermission, token: Token): boolean {
  if (isTokenV1(token)) {
    return permission === TokenPermission.PUBLIC || permission === TokenPermission.DRAFT;
  }
  if (isTokenV2(token)) {
    return token.permissions.includes(permission);
  }
  return false;
}

/**
 * Check if Token contains any of the required permissions
 * @param {TokenPermission[]} permissions
 * @param {Token} token request Token
 * @return {boolean} true in case any role is present
 */
export function canPerformAny(permissions: TokenPermission[], token: Token): boolean {
  return permissions.some(permission => canPerform(permission, token));
}
