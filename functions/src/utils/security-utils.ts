import {AuthData} from 'firebase-functions/lib/common/providers/https';
import {ROLE_CUSTOM} from '../config';
import {UserPermission} from '../models/user.model';


export class SecurityUtils {
  /**
   * Check roles of authenticated user
   * @param role roles to check
   * @param auth request AuthData
   */
  static hasRole(role: string, auth?: AuthData): boolean {
    return auth?.token['role'] === role;
  }

  /**
   * Check roles of authenticated user
   * @param roles roles to check
   * @param auth request AuthData
   */
  static hasAnyRole(roles: string[], auth?: AuthData): boolean {
    if (auth?.token['role']) {
      return roles.includes(auth.token['role']);
    }
    return false;
  }

  static hasPermission(permission: UserPermission, auth?: AuthData): boolean {
    return this.hasRole(ROLE_CUSTOM) && auth?.token['permissions'].includes(permission);
  }
}
